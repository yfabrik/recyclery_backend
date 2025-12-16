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
      this.belongsTo(models.Task, { foreignKey: "task_id" });
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      // this.belongsToMany(models.User,{through:"taskSchedule_employee",foreignKey:"schedule_id"})
      this.belongsTo(models.User, { foreignKey: "assigned_to" });
    }
  }
  TaskSchedule.init(
    {
      // task_id: DataTypes.INTEGER,//assoc
      // assigned_to: DataTypes.INTEGER, //assoc //task a deja un assigned
      // store_id: DataTypes.INTEGER,//assoc
      scheduled_date: DataTypes.DATE,
      start_time: DataTypes.TIME,
      end_time: DataTypes.TIME,
      status: DataTypes.STRING,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "TaskSchedule",
    }
  );
  return TaskSchedule;
};
