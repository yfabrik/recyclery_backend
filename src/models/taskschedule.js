"use strict";
import { Model } from "sequelize";
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
      this.hasMany(models.Task, { foreignKey: "schedule_id" });
      // this.hasOne(models.TaskTemplate,{foreignKey:"template_id"})
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      // this.belongsToMany(models.User,{through:"taskSchedule_employee",foreignKey:"schedule_id"})
      // this.belongsTo(models.User, { foreignKey: "assigned_to" });
    }
  }
  TaskSchedule.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      category: DataTypes.STRING,
      priority: DataTypes.STRING,
      estimated_duration: DataTypes.INTEGER,
      required_skills: DataTypes.TEXT,
      location: DataTypes.STRING,
      equipment_needed: DataTypes.TEXT,
      hourly_rate: DataTypes.DECIMAL,

      is_recurring: DataTypes.BOOLEAN,
      // assigned_to: DataTypes.INTEGER,//assoc
      notes: DataTypes.TEXT,
      status: DataTypes.STRING,
      // task_id: DataTypes.INTEGER,//assoc
      // assigned_to: DataTypes.INTEGER, //assoc //task a deja un assigned
      // store_id: DataTypes.INTEGER,//assoc
      scheduled_date: DataTypes.DATE,
      start_time: DataTypes.TIME,
      end_time: DataTypes.TIME,
      // status: DataTypes.STRING,
      // notes: DataTypes.TEXT,
      recurrence_pattern: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "TaskSchedule",
      hooks: {
        afterCreate: async (schedule) => {
          const data = { ...schedule.get({ plain: true }) }
          console.log(data)
          await schedule.createTask({
            ...data
          })
          // for await (const index of [1, 2, 3, 4]) {
          //   if (schedule.recurrence_pattern == "weekly")
          //     await schedule.createTask({
          //       ...data,
          //       scheduled_date: new Date().setDate(schedule.scheduled_date.getDate() + 7 * index)
          //     })
          //   if (schedule.recurrence_pattern == "daily")
          //     await schedule.createTask({
          //       ...data,
          //       scheduled_date: new Date().setDate(schedule.scheduled_date.getDate() + 1 * index)
          //     })
          //   if (schedule.recurrence_pattern == "monthly")
          //     await schedule.createTask({
          //       ...data,
          //       scheduled_date: new Date().setMonth(schedule.scheduled_date.getMonth() + 1 * index)
          //     })
          // }

        }
      }
    }
  );
  return TaskSchedule;
};
