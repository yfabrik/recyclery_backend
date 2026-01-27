"use strict";
import { Model, Op } from "sequelize";
import logger from "../services/logger.js";
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
      this.hasMany(models.Task, { foreignKey: "schedule_id", onDelete: "CASCADE" });
      // this.hasOne(models.TaskTemplate,{foreignKey:"template_id"})
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      this.belongsTo(models.CollectionPoint,{foreignKey:"collection_point_id"})
      this.belongsToMany(models.Employee, { through: "employee_schedule" });

    }
  }

  TaskSchedule.init(
    {
      is_recurring: { type: DataTypes.BOOLEAN, defaultValue: true },
      recurrence_pattern: DataTypes.ENUM("daily", "weekly", "monthly"),

      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      category: { type: DataTypes.ENUM("vente", "point", "collection", "custom"), allowNull: false },
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
          const d = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(this.scheduled_date);
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
        afterCreate: async (schedule) => {
          const data = schedule.dataValues;
          const baseDate = new Date(schedule.scheduled_date);
          const tasksToCreate = [];

          // Calculate end date (one month from the base date)
          const endDate = new Date(baseDate);
          endDate.setMonth(endDate.getMonth() + 1);

          // Generate tasks based on recurrence pattern
          if (schedule.recurrence_pattern === "daily") {
            // Create tasks for each day until one month from base date
            let currentDate = new Date(baseDate);
            while (currentDate < endDate) {
              tasksToCreate.push({
                name: data.name,
                category: data.category,
                scheduled_date: new Date(currentDate),
                start_time: data.start_time,
                end_time: data.end_time,
                schedule_id: schedule.id,
                ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})


              });
              // Create new date object for next iteration to avoid mutation
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else if (schedule.recurrence_pattern === "weekly") {
            // Create tasks for each week until one month from base date
            let currentDate = new Date(baseDate);
            while (currentDate < endDate) {
              tasksToCreate.push({
                name: data.name,
                category: data.category,
                scheduled_date: new Date(currentDate),
                start_time: data.start_time,
                end_time: data.end_time,
                schedule_id: schedule.id,
                ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

              });
              // Create new date object for next iteration to avoid mutation
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() + 7);
            }
          } else if (schedule.recurrence_pattern === "monthly") {
            // For monthly, create one task one month from base date
            const nextMonthDate = new Date(baseDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            tasksToCreate.push({
              name: data.name,
              category: data.category,
              scheduled_date: nextMonthDate,
              start_time: data.start_time,
              end_time: data.end_time,
              schedule_id: schedule.id,
              ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

            });
          } else {
            // If no recurrence pattern or unknown pattern, create just the initial task
            tasksToCreate.push({
              name: data.name,
              category: data.category,
              scheduled_date: new Date(baseDate),
              start_time: data.start_time,
              end_time: data.end_time,
              schedule_id: schedule.id,
              ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

            });
          }

          // Use bulkCreate to create all tasks at once
          if (tasksToCreate.length > 0) {
            const Task = schedule.sequelize.models.Task;
            if (Task) {
              await Task.bulkCreate(tasksToCreate);
              logger.info(
                `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id} with pattern ${schedule.recurrence_pattern || "none"}`
              );
            } else {
              logger.error(`Task model not found for schedule ${schedule.id}`);
            }
          }
        },
        afterUpdate: async (schedule) => {
          const Task = schedule.sequelize.models.Task;
          if (!Task) {
            logger.error(`Task model not found for schedule ${schedule.id}`);
            return;
          }

          const now = new Date();
          // Access previous values (Sequelize stores them in _previousDataValues during hooks)
          const previousValues = schedule._previousDataValues || {};
          const currentValues = schedule.dataValues;

          // Helper function to generate tasks based on recurrence pattern
          const generateTasks = (baseDate, recurrencePattern, isRecurring, data) => {
            const tasksToCreate = [];
            if (!isRecurring) {
              // If not recurring, create just one task
              tasksToCreate.push({
                name: data.name,
                category: data.category,
                description: data.description,
                priority: data.priority,
                required_skills: data.required_skills,
                location: data.location,
                equipment_needed: data.equipment_needed,
                hourly_rate: data.hourly_rate,
                notes: data.notes,
                status: data.status,
                scheduled_date: new Date(baseDate),
                start_time: data.start_time,
                end_time: data.end_time,
                schedule_id: schedule.id,
...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})


              });
              return tasksToCreate;
            }

            // Calculate end date (one month from the base date)
            const endDate = new Date(baseDate);
            endDate.setMonth(endDate.getMonth() + 1);

            if (recurrencePattern === "daily") {
              let currentDate = new Date(baseDate);
              while (currentDate < endDate) {
                tasksToCreate.push({
                  name: data.name,
                  category: data.category,
                  description: data.description,
                  priority: data.priority,
                  required_skills: data.required_skills,
                  location: data.location,
                  equipment_needed: data.equipment_needed,
                  hourly_rate: data.hourly_rate,
                  notes: data.notes,
                  status: data.status,
                  scheduled_date: new Date(currentDate),
                  start_time: data.start_time,
                  end_time: data.end_time,
                  schedule_id: schedule.id,
                  ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

                });
                currentDate = new Date(currentDate);
                currentDate.setDate(currentDate.getDate() + 1);
              }
            } else if (recurrencePattern === "weekly") {
              let currentDate = new Date(baseDate);
              while (currentDate < endDate) {
                tasksToCreate.push({
                  name: data.name,
                  category: data.category,
                  description: data.description,
                  priority: data.priority,
                  required_skills: data.required_skills,
                  location: data.location,
                  equipment_needed: data.equipment_needed,
                  hourly_rate: data.hourly_rate,
                  notes: data.notes,
                  status: data.status,
                  scheduled_date: new Date(currentDate),
                  start_time: data.start_time,
                  end_time: data.end_time,
                  schedule_id: schedule.id,
                  ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

                });
                currentDate = new Date(currentDate);
                currentDate.setDate(currentDate.getDate() + 7);
              }
            } else if (recurrencePattern === "monthly") {
              const nextMonthDate = new Date(baseDate);
              nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
              tasksToCreate.push({
                name: data.name,
                category: data.category,
                description: data.description,
                priority: data.priority,
                required_skills: data.required_skills,
                location: data.location,
                equipment_needed: data.equipment_needed,
                hourly_rate: data.hourly_rate,
                notes: data.notes,
                status: data.status,
                scheduled_date: nextMonthDate,
                start_time: data.start_time,
                end_time: data.end_time,
                schedule_id: schedule.id,
                ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

              });
            } else {
              // If no recurrence pattern or unknown pattern, create just the initial task
              tasksToCreate.push({
                name: data.name,
                category: data.category,
                description: data.description,
                priority: data.priority,
                required_skills: data.required_skills,
                location: data.location,
                equipment_needed: data.equipment_needed,
                hourly_rate: data.hourly_rate,
                notes: data.notes,
                status: data.status,
                scheduled_date: new Date(baseDate),
                start_time: data.start_time,
                end_time: data.end_time,
                schedule_id: schedule.id,
                ...(data?.store_id?{store_id: data.store_id}:{}),
                ...(data?.collection_point_id?{collection_point_id: data.collection_point_id}:{})

              });
            }
            return tasksToCreate;
          };

          // Check if is_recurring changed from true to false
          const wasRecurring = previousValues.is_recurring;
          const isRecurring = currentValues.is_recurring;
          const recurringChanged = wasRecurring !== undefined && wasRecurring !== isRecurring;

          // Check if recurrence_pattern changed
          const patternChanged =
            previousValues.recurrence_pattern !== undefined &&
            previousValues.recurrence_pattern !== currentValues.recurrence_pattern;

          // Check if scheduled_date changed (day changed)
          const prevDate = previousValues.scheduled_date
            ? new Date(previousValues.scheduled_date).getTime()
            : null;
          const currDate = currentValues.scheduled_date
            ? new Date(currentValues.scheduled_date).getTime()
            : null;
          const dateChanged = prevDate !== null && currDate !== null && prevDate !== currDate;

          // Get all future tasks for this schedule
          const futureTasks = await Task.findAll({
            where: {
              schedule_id: schedule.id,
              scheduled_date: {
                [Op.gte]: now,
              },
            },
          });

          // Case 1: is_recurring changed from true to false - delete all future tasks
          if (recurringChanged && wasRecurring === true && isRecurring === false) {
            if (futureTasks.length > 0) {
              await Task.destroy({
                where: {
                  id: {
                    [Op.in]: futureTasks.map((t) => t.id),
                  },
                },
              });
              logger.info(
                `Deleted ${futureTasks.length} future task(s) for schedule ${schedule.id} because is_recurring changed to false`
              );
            }
            return;
          }

          // Case 2: is_recurring changed from false to true - create tasks based on recurrence pattern
          if (recurringChanged && wasRecurring === false && isRecurring === true) {
            const baseDate = new Date(currentValues.scheduled_date || now);
            const tasksToCreate = generateTasks(
              baseDate,
              currentValues.recurrence_pattern,
              true,
              currentValues
            );
            if (tasksToCreate.length > 0) {
              await Task.bulkCreate(tasksToCreate);
              logger.info(
                `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id} because is_recurring changed to true with pattern ${currentValues.recurrence_pattern || "none"}`
              );
            }
            return;
          }

          // Case 3: recurrence_pattern changed or scheduled_date changed - remove and recreate future tasks
          if (patternChanged || dateChanged) {
            // Delete all future tasks
            if (futureTasks.length > 0) {
              await Task.destroy({
                where: {
                  id: {
                    [Op.in]: futureTasks.map((t) => t.id),
                  },
                },
              });
              logger.info(
                `Deleted ${futureTasks.length} future task(s) for schedule ${schedule.id} because ${patternChanged ? "recurrence_pattern" : "scheduled_date"} changed`
              );
            }

            // Recreate tasks with new pattern/date
            if (isRecurring) {
              const baseDate = new Date(currentValues.scheduled_date || now);
              const tasksToCreate = generateTasks(
                baseDate,
                currentValues.recurrence_pattern,
                isRecurring,
                currentValues
              );
              if (tasksToCreate.length > 0) {
                await Task.bulkCreate(tasksToCreate);
                logger.info(
                  `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id} with new ${patternChanged ? "recurrence_pattern" : "scheduled_date"}`
                );
              }
            }
            return;
          }

          // Case 4: Other fields changed (name, description, times, etc.) - update existing future tasks
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

          if (Object.keys(fieldsToUpdate).length > 0 && futureTasks.length > 0) {
            await Task.update(fieldsToUpdate, {
              where: {
                schedule_id: schedule.id,
                scheduled_date: {
                  [Op.gte]: now,
                },
              },
            });
            logger.info(
              `Updated ${futureTasks.length} future task(s) for schedule ${schedule.id} with fields: ${Object.keys(fieldsToUpdate).join(", ")}`
            );
          }
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
              }
            );
            const updatedCount = result[0]; // Sequelize update returns [affectedCount, affectedRows]
            if (updatedCount > 0) {
              logger.info(
                `Set schedule_id to null for ${updatedCount} past task(s) when destroying schedule ${schedule.id}`
              );
            }
          } else {
            logger.error(`Task model not found when destroying schedule ${schedule.id}`);
          }
        },
      },
    }
  );
  return TaskSchedule;
};
