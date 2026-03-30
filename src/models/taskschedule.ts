import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  Op,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
  type WhereOptions,
} from "sequelize";
// @ts-expect-error local JS module has no .d.ts yet
import logger from "../services/logger.js";
// @ts-expect-error local JS module has no .d.ts yet
import { generateTasksFromSchedule } from "../services/taskScheduleUtils.js";
import type { Models } from "./db-types.ts";
import type CollectionPoint from "./collectionpoint.ts";
import type Employee from "./employee.ts";
import type Recyclery from "./recyclery.ts";
import type Task from "./task.ts";

export default class TaskSchedule extends Model<InferAttributes<TaskSchedule>, InferCreationAttributes<TaskSchedule>> {
  declare id: CreationOptional<number>;
  declare is_recurring: boolean;
  declare recurrence_pattern: "daily" | "weekly" | "monthly" | null;
  declare name: string | null;
  declare description: string | null;
  declare category: "vente" | "point" | "collection" | "custom";
  declare priority: string | null;
  declare required_skills: string | null;
  declare location: string | null;
  declare equipment_needed: string | null;
  declare hourly_rate: string | null;
  declare notes: string | null;
  declare status: string | null;
  declare scheduled_date: Date;
  declare start_time: Date;
  declare end_time: Date;
  declare day_of_week: string | null;
  declare store_id: ForeignKey<number | null>;
  declare collection_point_id: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Tasks?: NonAttribute<Task[]>;
  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare CollectionPoint?: NonAttribute<CollectionPoint | null>;
  declare Employees?: NonAttribute<Employee[]>;

  declare getTasks: HasManyGetAssociationsMixin<Task>;
  declare addTask: HasManyAddAssociationMixin<Task, number>;
  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, number>;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<CollectionPoint, number>;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<Employee, number>;
  declare addEmployee: BelongsToManyAddAssociationMixin<Employee, number>;

  static associate(models: Models) {
    this.hasMany(models.Task, { foreignKey: "schedule_id", onDelete: "CASCADE" });
    this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
    this.belongsTo(models.CollectionPoint, { foreignKey: "collection_point_id" });
    this.belongsToMany(models.Employee, { through: "employee_schedule" });
  }

  static initModel(sequelize: Sequelize) {
    const conflictCheck = async (data: TaskSchedule) => {
      const values = data.dataValues
      if(values.category === "custom") return;
      const toMinutes = (v: Date | number) => {
        const d = v instanceof Date ? v : new Date(v);
        return d.getHours() * 60 + d.getMinutes();
      };

      const newStart = toMinutes(values.start_time);
      const newEnd = toMinutes(values.end_time);
      const where: WhereOptions<TaskSchedule> = { category: values.category };
      if (values.store_id) where.store_id = values.store_id;
      if (values.collection_point_id) where.collection_point_id = values.collection_point_id;
      if (values.id) where.id = { [Op.not]: values.id };

      const existing = await TaskSchedule.findAll({ where });
      const hasOverlap = existing.some((e) => {
        if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
        if (e.scheduled_date.getDay() !== values.scheduled_date.getDay()) return false;
        const start = toMinutes(e.start_time);
        const end = toMinutes(e.end_time);
        return start < newEnd && end > newStart;
      });
      if (hasOverlap) {
        throw new createHttpError.Conflict("Conflit d'horaires avec une autre tâche planifiée");
      }
    };

    const createTasksFrom = async (
      schedule: TaskSchedule,
      tasksToCreate: any[],
      recurrencePattern: string | null,
      reason = "",
    ) => {
      if (tasksToCreate.length === 0) return;
      const Task = schedule.sequelize.models.Task as ModelStatic<Task>;
      if (!Task) {
        logger.error(`Task model not found for schedule ${schedule.id}`);
        return;
      }
      await Task.bulkCreate(tasksToCreate);
      const reasonText = reason ? ` ${reason}` : "";
      logger.info(
        `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id}${reasonText} with pattern ${recurrencePattern || "none"}`,
      );
    };

    const getFutureTasks = async (Task: ModelStatic<Task>, scheduleId: number, now: Date) =>
      Task.findAll({
        where: {
          schedule_id: scheduleId,
          scheduled_date: { [Op.gte]: now },
        },
      });

    const deleteFutureTasks = async (Task: ModelStatic<Task>, futureTasks: Task[], scheduleId: number, reason: string) => {
      if (futureTasks.length === 0) return;
      await Task.destroy({
        where: {
          id: { [Op.in]: futureTasks.map((t) => t.id) },
        },
      });
      logger.info(`Deleted ${futureTasks.length} future task(s) for schedule ${scheduleId} because ${reason}`);
    };

    const updateFutureTasksFields = async (
      Task: ModelStatic<Task>,
      scheduleId: number,
      schedule: TaskSchedule,
      previousValues: Partial<InferAttributes<TaskSchedule>>,
      currentValues: InferAttributes<TaskSchedule>,
      now: Date,
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
      ] as const satisfies readonly (keyof InferAttributes<TaskSchedule>)[];

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
        }
      }
      if (Object.keys(fieldsToUpdate).length === 0) return;
      const result = await Task.update(fieldsToUpdate, {
        where: {
          schedule_id: scheduleId,
          scheduled_date: { [Op.gte]: now },
        },
      });
      const updatedCount = result[0];
      if (updatedCount > 0) {
        logger.info(
          `Updated ${updatedCount} future task(s) for schedule ${scheduleId} with fields: ${Object.keys(fieldsToUpdate).join(", ")}`,
        );
      }
    };

    TaskSchedule.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        is_recurring: { type: DataTypes.BOOLEAN, defaultValue: true },
        recurrence_pattern: DataTypes.ENUM("daily", "weekly", "monthly"),
        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        category: {
          type: DataTypes.ENUM("vente", "point", "collection", "custom"),
          allowNull: false,
        },
        priority: DataTypes.STRING,
        required_skills: DataTypes.TEXT,
        location: DataTypes.STRING,
        equipment_needed: DataTypes.TEXT,
        hourly_rate: DataTypes.DECIMAL,
        notes: DataTypes.TEXT,
        status: DataTypes.STRING,
        scheduled_date: { type: DataTypes.DATE, allowNull: false },
        start_time: { type: DataTypes.DATE, allowNull: false },
        end_time: { type: DataTypes.DATE, allowNull: false },
        day_of_week: {
          type: DataTypes.VIRTUAL,
          get(this: TaskSchedule) {
            if (!this.scheduled_date) return null;
            const d = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(this.scheduled_date);
            return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
          },
        },
        store_id: DataTypes.INTEGER,
        collection_point_id: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "TaskSchedule",
        indexes: [{ fields: ["store_id"] }, { fields: ["scheduled_date"] }, { fields: ["status"] }, { fields: ["category"] }],
        hooks: {
          beforeCreate: async (data: TaskSchedule) => {
            logger.info("check for conflict before create schedule");
            await conflictCheck(data);
          },
          afterCreate: async (schedule: TaskSchedule) => {
            const data = schedule.dataValues;
            const baseDate = new Date(schedule.scheduled_date ?? new Date());
            const isRecurring = schedule.is_recurring ?? true;
            const recurrencePattern = schedule.recurrence_pattern;
            const tasksToCreate = generateTasksFromSchedule(
              baseDate,
              recurrencePattern,
              isRecurring,
              data,
              schedule.id,
            );
            await createTasksFrom(schedule, tasksToCreate, recurrencePattern);
          },
          beforeUpdate: async (data) => {
            logger.info("check for conflict before update schedule");
            await conflictCheck(data);
            logger.info("no conflict");
          },
          afterUpdate: async (schedule, options) => {
            logger.info("after update schedules");
            const Task = schedule.sequelize.models.Task as ModelStatic<Task>;
            if (!Task) {
              logger.error(`Task model not found for schedule ${schedule.id}`);
              return;
            }
            const now = new Date();
            const previousValues = schedule.previous()
            const currentValues = schedule.dataValues;
            const wasRecurring = schedule.previous("is_recurring");
            const isRecurring = currentValues.is_recurring;
            const recurringChanged = schedule.changed("is_recurring");
            const patternChanged = schedule.changed("recurrence_pattern");
            const prevDate = schedule.previous("scheduled_date") !== null || schedule.previous("scheduled_date") !== undefined ? new Date(schedule.previous("scheduled_date")).getTime() : null;
            const currDate = schedule.scheduled_date ? new Date(schedule.scheduled_date).getTime() : null;
            const dateChanged = prevDate !== null && currDate !== null && prevDate !== currDate;
            const futureTasks = await getFutureTasks(Task, schedule.id, now);

            if (recurringChanged && wasRecurring === true && isRecurring === false) {
              await deleteFutureTasks(Task, futureTasks, schedule.id, "is_recurring changed to false");
              return;
            }
            if (recurringChanged && wasRecurring === false && isRecurring === true) {
              const baseDate = new Date(currentValues.scheduled_date || now);
              const tasksToCreate = generateTasksFromSchedule(
                baseDate,
                currentValues.recurrence_pattern,
                true,
                currentValues,
                schedule.id,
              );
              await createTasksFrom(schedule, tasksToCreate, currentValues.recurrence_pattern, "because is_recurring changed to true with pattern");
              return;
            }
            if (patternChanged || dateChanged) {
              await deleteFutureTasks(
                Task,
                futureTasks,
                schedule.id,
                `${patternChanged ? "recurrence_pattern" : "scheduled_date"} changed`,
              );
              if (isRecurring) {
                const baseDate = new Date(currentValues.scheduled_date || now);
                const tasksToCreate = generateTasksFromSchedule(
                  baseDate,
                  currentValues.recurrence_pattern,
                  isRecurring,
                  currentValues,
                  schedule.id,
                );
                await createTasksFrom(
                  schedule,
                  tasksToCreate,
                  currentValues.recurrence_pattern,
                  `with new ${patternChanged ? "recurrence_pattern" : "scheduled_date"}`,
                );
              }
              return;
            }
            await updateFutureTasksFields(Task, schedule.id,schedule, previousValues, currentValues, now);
          },
          beforeDestroy: async (schedule) => {
            const Task = schedule.sequelize.models.Task as ModelStatic<Task>;
            if (Task) {
              const now = new Date();
              const result = await Task.update(
                { schedule_id: null },
                {
                  where: {
                    schedule_id: schedule.id,
                    scheduled_date: { [Op.lt]: now },
                  },
                },
              );
              const updatedCount = result[0];
              if (updatedCount > 0) {
                logger.info(`Set schedule_id to null for ${updatedCount} past task(s) when destroying schedule ${schedule.id}`);
              }
            } else {
              logger.error(`Task model not found when destroying schedule ${schedule.id}`);
            }
          },
        },
      },
    );
  }
}
