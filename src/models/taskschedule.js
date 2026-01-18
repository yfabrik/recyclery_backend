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
      // this.belongsToMany(models.User,{through:"taskSchedule_employee",foreignKey:"schedule_id"})
      // this.belongsTo(models.User, { foreignKey: "assigned_to" });
    }
  }

  // receipt_number: DataTypes.STRING, //assoc ?
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
      // task_id: DataTypes.INTEGER,//assoc
      // assigned_to: DataTypes.INTEGER, //assoc //task a deja un assigned
      // store_id: DataTypes.INTEGER,//assoc
      scheduled_date: DataTypes.DATE,
      start_time: DataTypes.DATE,
      end_time: DataTypes.DATE,
      day_of_week: {
        type: DataTypes.VIRTUAL,
        get() {
          const d = new Intl.DateTimeFormat("fr-FR", { weekday: "long", }).format(this.scheduled_date)
          return d.charAt(0).toUpperCase() + d.slice(1)
        }
      },
      // status: DataTypes.STRING,
      // notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "TaskSchedule",
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
