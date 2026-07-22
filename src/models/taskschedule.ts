import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  Op,
  type Attributes,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreateOptions,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type InstanceUpdateOptions,
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
  type WhereOptions,
} from "sequelize";
import logger from "../services/logger.js";
import { generateTasksFromSchedule } from "../services/taskScheduleUtils.js";
import { weekday } from "../utils/dates.js";
import { withTransaction } from "../utils/transaction.js";
import type CollectionPoint from "./collectionpoint.ts";
import type { ModelStatics } from "./db-types.ts";
import type Employee from "./employee.ts";
import type Recyclery from "./recyclery.ts";
import type Task from "./task.ts";
import {
  RECURRENCE_PATTERNS,
  TASK_CATEGORIES,
  type RecurrencePattern,
  type TaskCategory,
} from "../constants/dbEnums.js";

export default class TaskSchedule extends Model<
  InferAttributes<TaskSchedule>,
  InferCreationAttributes<TaskSchedule>
> {
  declare id: CreationOptional<number>;
  declare is_recurring: CreationOptional<boolean>;
  declare recurrence_pattern: RecurrencePattern | null;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare category: TaskCategory;
  declare priority: CreationOptional<string | null>;
  declare required_skills: CreationOptional<string | null>;
  declare location: CreationOptional<string | null>;
  declare equipment_needed: CreationOptional<string | null>;
  declare hourly_rate: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare status: CreationOptional<string | null>;
  declare scheduled_date: Date;
  declare start_time: Date;
  declare end_time: Date;

  declare day_of_week: NonAttribute<number | null>;

  declare store_id: ForeignKey<Recyclery["id"] | null>;
  declare collection_point_id: ForeignKey<CollectionPoint["id"] | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Tasks?: NonAttribute<Task[]>;
  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare CollectionPoint?: NonAttribute<CollectionPoint | null>;
  declare Employees?: NonAttribute<Employee[]>;

  declare getTasks: HasManyGetAssociationsMixin<Task>;
  declare addTask: HasManyAddAssociationMixin<Task, Task["id"]>;
  declare createTask: HasManyCreateAssociationMixin<Task>;
  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<
    CollectionPoint,
    CollectionPoint["id"]
  >;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<
    Employee,
    Employee["id"]
  >;
  declare addEmployee: BelongsToManyAddAssociationMixin<
    Employee,
    Employee["id"]
  >;

  static associate(models: ModelStatics) {
    this.hasMany(models.Task, {
      foreignKey: "schedule_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.Recyclery, {
      foreignKey: "store_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.CollectionPoint, {
      foreignKey: "collection_point_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.Employee, {
      through: "employee_schedule",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    }); //TODO really GOOD ?
  }

  static initModel(sequelize: Sequelize) {
    const conflictCheck = async (data: TaskSchedule) => {
      const values = data.dataValues;
      if (values.category === "custom") return;
      const toMinutes = (v: Date | number) => {
        const d = v instanceof Date ? v : new Date(v);
        return d.getHours() * 60 + d.getMinutes();
      };

      const newStart = toMinutes(values.start_time);
      const newEnd = toMinutes(values.end_time);
      const where: WhereOptions<Attributes<TaskSchedule>> = {
        category: values.category,
      };
      if (values.store_id) where.store_id = values.store_id;
      if (values.collection_point_id)
        where.collection_point_id = values.collection_point_id;
      if (values.id) where.id = { [Op.not]: values.id };

      const existing = await TaskSchedule.findAll({ where });
      const hasOverlap = existing.some((e) => {
        if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
        if (e.scheduled_date.getDay() !== values.scheduled_date.getDay())
          return false;
        const start = toMinutes(e.start_time);
        const end = toMinutes(e.end_time);
        return start < newEnd && end > newStart;
      });
      if (hasOverlap) {
        throw new createHttpError.Conflict(
          "Conflit d'horaires avec une autre tâche planifiée",
        );
      }
    };

    /**
     * create tasks owned by the schedule
     * @param schedule
     * @param tasksToCreate
     * @param reason
     * @param options
     * @returns
     */
    const createTasksFrom = async (
      schedule: TaskSchedule,
      tasksToCreate: InferCreationAttributes<Task>[],
      reason = "",
      options?: CreateOptions<TaskSchedule>,
    ) => {
      if (tasksToCreate.length === 0) return;
      const Task = schedule.sequelize.models.Task as ModelStatic<Task>;
      if (!Task) {
        logger.error(`Task model not found for schedule ${schedule.id}`);
        return;
      }
      await Task.bulkCreate(tasksToCreate, {
        transaction: options?.transaction ?? null,
      });
      const reasonText = reason ? ` ${reason}` : "";
      logger.info(
        `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id}${reasonText} with pattern ${schedule.recurrence_pattern || "none"}`,
      );
    };

    const getFutureTasks = async (
      Task: ModelStatic<Task>,
      scheduleId: TaskSchedule["id"],
      now: Date,
    ) =>
      Task.findAll({
        where: {
          schedule_id: scheduleId,
          scheduled_date: { [Op.gte]: now },
        },
      });

    const deleteFutureTasks = async (
      Task: ModelStatic<Task>,
      futureTasks: Task[],
      scheduleId: TaskSchedule["id"],
      reason: string,
      options?: CreateOptions<TaskSchedule>,
    ) => {
      if (futureTasks.length === 0) return;
      await Task.destroy({
        where: {
          id: { [Op.in]: futureTasks.map((t) => t.id) },
        },
        transaction: options?.transaction ?? null,
      });
      logger.info(
        `Deleted ${futureTasks.length} future task(s) for schedule ${scheduleId} because ${reason}`,
      );
    };

    const updateFutureTasksFields = async (
      Task: ModelStatic<Task>,
      schedule: TaskSchedule,
      now: Date,
      options?: InstanceUpdateOptions<TaskSchedule>,
    ) => {
      const fieldsToUpdate: Partial<InferAttributes<Task>> = {};
      const updatableFields = [
        "name",
        "description",
        "category",
        "priority",
        "required_skills",
        "location",
        "equipment_needed",
        "hourly_rate",
        "notes",
        "status",
        "start_time",
        "end_time",
        "store_id",
      ] as const satisfies readonly (keyof InferAttributes<Task>)[];

      for (const field of updatableFields) {
        if (!schedule.changed(field)) continue;
        // Avoid computed indexing to keep TS from collapsing the assignment type to `never`.
        switch (field) {
          case "name":
            fieldsToUpdate.name = schedule.name;
            break;
          case "description":
            fieldsToUpdate.description = schedule.description;
            break;
          case "category":
            fieldsToUpdate.category = schedule.category;
            break;
          case "priority":
            fieldsToUpdate.priority = schedule.priority;
            break;
          case "required_skills":
            fieldsToUpdate.required_skills = schedule.required_skills;
            break;
          case "location":
            fieldsToUpdate.location = schedule.location;
            break;
          case "equipment_needed":
            fieldsToUpdate.equipment_needed = schedule.equipment_needed;
            break;
          case "hourly_rate":
            fieldsToUpdate.hourly_rate = schedule.hourly_rate;
            break;
          case "notes":
            fieldsToUpdate.notes = schedule.notes;
            break;
          case "status":
            fieldsToUpdate.status = schedule.status;
            break;
          case "start_time":
            fieldsToUpdate.start_time = schedule.start_time;
            break;
          case "end_time":
            fieldsToUpdate.end_time = schedule.end_time;
            break;
          case "store_id":
            fieldsToUpdate.store_id = schedule.store_id;
            break;
          default:
            field satisfies never;
            break;
        }
      }
      if (Object.keys(fieldsToUpdate).length === 0) return;
      const result = await Task.update(fieldsToUpdate, {
        where: {
          schedule_id: schedule.id,
          scheduled_date: { [Op.gte]: now },
        },
        transaction: options?.transaction ?? null,
      });
      const updatedCount = result[0];
      if (updatedCount > 0) {
        logger.info(
          `Updated ${updatedCount} future task(s) for schedule ${schedule.id} with fields: ${Object.keys(fieldsToUpdate).join(", ")}`,
        );
      }
    };

    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        is_recurring: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        recurrence_pattern: DataTypes.ENUM(...RECURRENCE_PATTERNS),
        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        category: {
          type: DataTypes.ENUM(...TASK_CATEGORIES),
          allowNull: false,
        },
        priority: DataTypes.STRING,
        required_skills: DataTypes.TEXT,
        location: DataTypes.STRING,
        equipment_needed: DataTypes.TEXT,
        hourly_rate: DataTypes.DECIMAL,
        notes: DataTypes.TEXT,
        status: DataTypes.STRING,
        scheduled_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        start_time: { type: DataTypes.DATE, allowNull: false },
        end_time: { type: DataTypes.DATE, allowNull: false },
        // @ts-expect-error  sequelize virtual marqued as nonattribute
        day_of_week: {
          type: DataTypes.VIRTUAL,
          get(this: TaskSchedule) {
            if (!this.scheduled_date) return null;
            return weekday(this.scheduled_date);
          },
        },

        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "TaskSchedule",
        indexes: [
          { fields: ["store_id"] },
          { fields: ["scheduled_date"] },
          { fields: ["status"] },
          { fields: ["category"] },
        ],
        hooks: {
          beforeCreate: async (data: TaskSchedule) => {
            logger.info("check for conflict before create schedule");
            await conflictCheck(data);
          },
          afterCreate: async (schedule: TaskSchedule, options) => {
            await withTransaction(
              schedule.sequelize!,
              options.transaction,
              async (transaction) => {
                const opts = { ...options, transaction };
                const baseDate = new Date(schedule.scheduled_date);
                const isRecurring = schedule.is_recurring;
                const tasksToCreate = generateTasksFromSchedule(
                  baseDate,
                  isRecurring,
                  schedule,
                );
                await createTasksFrom(schedule, tasksToCreate, "", opts);
              },
            );
          },
          beforeUpdate: async (data) => {
            logger.info("check for conflict before update schedule");
            await conflictCheck(data);
            logger.info("no conflict");
          },
          afterUpdate: async (schedule, options) => {
            await withTransaction(
              schedule.sequelize!,
              options.transaction,
              async (transaction) => {
                const opts = { ...options, transaction };
                const Task = schedule.sequelize.models.Task as
                  | ModelStatic<Task>
                  | undefined;
                if (!Task) {
                  logger.error(
                    `Task model not found for schedule ${schedule.id}`,
                  );
                  return;
                }
                const now = new Date();
                const wasRecurring = schedule.previous("is_recurring");
                const isRecurring = schedule.is_recurring;
                const recurringChanged = schedule.changed("is_recurring");
                const patternChanged = schedule.changed("recurrence_pattern");
                const dateChanged = schedule.changed("scheduled_date"); // prevDate !== null && currDate !== null && prevDate !== currDate;
                const futureTasks = await getFutureTasks(
                  Task,
                  schedule.id,
                  now,
                );
                if (
                  recurringChanged &&
                  wasRecurring === true &&
                  isRecurring === false
                ) {
                  await deleteFutureTasks(
                    Task,
                    futureTasks,
                    schedule.id,
                    "is_recurring changed to false",
                    opts,
                  );
                  return;
                }
                if (
                  recurringChanged &&
                  wasRecurring === false &&
                  isRecurring === true
                ) {
                  const baseDate = new Date(schedule.scheduled_date || now);
                  const tasksToCreate = generateTasksFromSchedule(
                    baseDate,
                    isRecurring,
                    schedule,
                  );
                  await createTasksFrom(
                    schedule,
                    tasksToCreate,
                    "because is_recurring changed to true with pattern",
                    opts,
                  );
                  return;
                }
                if (patternChanged || dateChanged) {
                  await deleteFutureTasks(
                    Task,
                    futureTasks,
                    schedule.id,
                    `${patternChanged ? "recurrence_pattern" : "scheduled_date"} changed`,
                    opts,
                  );
                  if (isRecurring) {
                    const baseDate = new Date(schedule.scheduled_date || now);
                    const tasksToCreate = generateTasksFromSchedule(
                      baseDate,
                      isRecurring,
                      schedule,
                    );
                    await createTasksFrom(
                      schedule,
                      tasksToCreate,
                      `with new ${patternChanged ? "recurrence_pattern" : "scheduled_date"}`,
                      opts,
                    );
                  }
                  return;
                }
                await updateFutureTasksFields(Task, schedule, now, opts);
              },
            );
          },
          beforeDestroy: async (schedule, options) => {
            await withTransaction(
              schedule.sequelize!,
              options.transaction,
              async (transaction) => {
                const Task = schedule.sequelize.models.Task as
                  | ModelStatic<Task>
                  | undefined;
                if (Task) {
                  const now = new Date();
                  const result = await Task.update(
                    { schedule_id: null },
                    {
                      where: {
                        schedule_id: schedule.id,
                        scheduled_date: { [Op.lt]: now },
                      },
                      transaction,
                    },
                  );
                  const updatedCount = result[0];
                  if (updatedCount > 0) {
                    logger.info(
                      `Set schedule_id to null for ${updatedCount} past task(s) when destroying schedule ${schedule.id}`,
                    );
                  }
                } else {
                  logger.error(
                    `Task model not found when destroying schedule ${schedule.id}`,
                  );
                }
              },
            );
          },
        },
      },
    );
  }
}
