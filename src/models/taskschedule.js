"use strict";
import { Model, Op } from "sequelize";
import logger from "../services/logger.js";
import { generateTasksFromSchedule } from "../services/taskScheduleUtils.js";
import createHttpError from "http-errors";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class TaskSchedule extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.hasMany(models.Task, {
        foreignKey: "schedule_id",
        onDelete: "CASCADE",
      });
      // this.hasOne(models.TaskTemplate,{foreignKey:"template_id"})
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      this.belongsTo(models.CollectionPoint, {
        foreignKey: "collection_point_id",
      });
      this.belongsToMany(models.Employee, { through: "employee_schedule" });
    }
  }

  const conflictCheck = async (data) => {
    const values = data.dataValues;
    const toMinutes = (/** @type {Date | number} */ v) => {
      const d = v instanceof Date ? v : new Date(v);
      return d.getHours() * 60 + d.getMinutes();
    };
    const newStart = toMinutes(values.start_time);
    const newEnd = toMinutes(values.end_time);

    const where = { category: values.category };
    if (values.id) where.id = { [Op.not]: values.id };
    const existing = await TaskSchedule.findAll({
      where,
    });

    const hasOverlap = existing.some((e) => {
      if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
      if (e.scheduled_date.getDay() !== values.scheduled_date.getDay())
        return false;

      const start = toMinutes(e.start_time);
      const end = toMinutes(e.end_time);
      return start < newEnd && end > newStart;
    });
    if (hasOverlap)
      throw new createHttpError.Conflict(
        "Conflit d'horaires avec une autre tâche planifiée",
      );
  };

  // Helper function to create tasks in bulk
  const createTasksFromSchedule = async (
    schedule,
    tasksToCreate,
    recurrencePattern,
    reason = "",
  ) => {
    if (tasksToCreate.length === 0) return;

    const Task = schedule.sequelize.models.Task;
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

  // Helper function to get future tasks
  const getFutureTasks = async (Task, scheduleId, now) => {
    return await Task.findAll({
      where: {
        schedule_id: scheduleId,
        scheduled_date: {
          [Op.gte]: now,
        },
      },
    });
  };

  // Helper function to delete future tasks
  const deleteFutureTasks = async (Task, futureTasks, scheduleId, reason) => {
    if (futureTasks.length === 0) return;

    await Task.destroy({
      where: {
        id: {
          [Op.in]: futureTasks.map((t) => t.id),
        },
      },
    });
    logger.info(
      `Deleted ${futureTasks.length} future task(s) for schedule ${scheduleId} because ${reason}`,
    );
  };

  // Helper function to update future tasks fields
  const updateFutureTasksFields = async (
    Task,
    scheduleId,
    previousValues,
    currentValues,
    now,
  ) => {
    const fieldsToUpdate = {};
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
    ];

    for (const field of updatableFields) {
      if (
        previousValues[field] !== undefined &&
        previousValues[field] !== currentValues[field]
      ) {
        fieldsToUpdate[field] = currentValues[field];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) return;

    const result = await Task.update(fieldsToUpdate, {
      where: {
        schedule_id: scheduleId,
        scheduled_date: {
          [Op.gte]: now,
        },
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
      is_recurring: { type: DataTypes.BOOLEAN, defaultValue: true },
      recurrence_pattern: DataTypes.ENUM("daily", "weekly", "monthly"),

      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      category: {
        type: DataTypes.ENUM("vente", "point", "collection", "custom"),
        allowNull: false,
      },
      priority: DataTypes.STRING,
      // estimated_duration: DataTypes.INTEGER,
      required_skills: DataTypes.TEXT,
      location: DataTypes.STRING,
      equipment_needed: DataTypes.TEXT,
      hourly_rate: DataTypes.DECIMAL,

      // assigned_to: DataTypes.INTEGER,//assoc
      notes: DataTypes.TEXT,
      status: DataTypes.STRING,
      scheduled_date: DataTypes.DATE,
      start_time: DataTypes.DATE,
      end_time: DataTypes.DATE,
      day_of_week: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.scheduled_date) return null;
          const d = new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
          }).format(this.scheduled_date);
          return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
        },
      },
      // status: DataTypes.STRING,
      // notes: DataTypes.TEXT,
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
        beforeCreate: async (data, options) => {
          logger.info("check for conflict before create schedule");
          conflictCheck(data);
        },

        afterCreate: async (schedule) => {
          const data = schedule.dataValues;
          const baseDate = new Date(schedule.scheduled_date);
          const isRecurring = schedule.is_recurring ?? true;
          const recurrencePattern = schedule.recurrence_pattern;

          const tasksToCreate = generateTasksFromSchedule(
            baseDate,
            recurrencePattern,
            isRecurring,
            data,
            schedule.id,
          );

          await createTasksFromSchedule(
            schedule,
            tasksToCreate,
            recurrencePattern,
          );
        },
        beforeUpdate: async (data, options) => {
          logger.info("check for conflict before update schedule", data);
          conflictCheck(data);
        },
        afterUpdate: async (schedule) => {
          const Task = schedule.sequelize.models.Task;
          if (!Task) {
            logger.error(`Task model not found for schedule ${schedule.id}`);
            return;
          }

          const now = new Date();
          const previousValues = schedule._previousDataValues || {};
          const currentValues = schedule.dataValues;

          // Check for changes
          const wasRecurring = previousValues.is_recurring;
          const isRecurring = currentValues.is_recurring;
          const recurringChanged =
            wasRecurring !== undefined && wasRecurring !== isRecurring;

          const patternChanged =
            previousValues.recurrence_pattern !== undefined &&
            previousValues.recurrence_pattern !==
              currentValues.recurrence_pattern;

          const prevDate = previousValues.scheduled_date
            ? new Date(previousValues.scheduled_date).getTime()
            : null;
          const currDate = currentValues.scheduled_date
            ? new Date(currentValues.scheduled_date).getTime()
            : null;
          const dateChanged =
            prevDate !== null && currDate !== null && prevDate !== currDate;

          // Get all future tasks for this schedule
          const futureTasks = await getFutureTasks(Task, schedule.id, now);

          // Case 1: is_recurring changed from true to false - delete all future tasks
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
            );
            return;
          }

          // Case 2: is_recurring changed from false to true - create tasks based on recurrence pattern
          if (
            recurringChanged &&
            wasRecurring === false &&
            isRecurring === true
          ) {
            const baseDate = new Date(currentValues.scheduled_date || now);
            const tasksToCreate = generateTasksFromSchedule(
              baseDate,
              currentValues.recurrence_pattern,
              true,
              currentValues,
              schedule.id,
            );
            await createTasksFromSchedule(
              schedule,
              tasksToCreate,
              currentValues.recurrence_pattern,
              "because is_recurring changed to true with pattern",
            );
            return;
          }

          // Case 3: recurrence_pattern changed or scheduled_date changed - remove and recreate future tasks
          if (patternChanged || dateChanged) {
            await deleteFutureTasks(
              Task,
              futureTasks,
              schedule.id,
              `${patternChanged ? "recurrence_pattern" : "scheduled_date"} changed`,
            );

            // Recreate tasks with new pattern/date
            if (isRecurring) {
              const baseDate = new Date(currentValues.scheduled_date || now);
              const tasksToCreate = generateTasksFromSchedule(
                baseDate,
                currentValues.recurrence_pattern,
                isRecurring,
                currentValues,
                schedule.id,
              );
              await createTasksFromSchedule(
                schedule,
                tasksToCreate,
                currentValues.recurrence_pattern,
                `with new ${patternChanged ? "recurrence_pattern" : "scheduled_date"}`,
              );
            }
            return;
          }

          // Case 4: Other fields changed - update existing future tasks
          await updateFutureTasksFields(
            Task,
            schedule.id,
            previousValues,
            currentValues,
            now,
          );
        },
        beforeDestroy: async (schedule) => {
          const Task = schedule.sequelize.models.Task;
          if (Task) {
            const now = new Date();
            // Update tasks in the past to set schedule_id to null
            const result = await Task.update(
              { schedule_id: null },
              {
                where: {
                  schedule_id: schedule.id,
                  scheduled_date: {
                    [Op.lt]: now, // Less than current date/time (tasks in the past)
                  },
                },
              },
            );
            const updatedCount = result[0]; // Sequelize update returns [affectedCount, affectedRows]
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
      },
    },
  );
  return TaskSchedule;
};
