'use strict';
import { Model } from 'sequelize';
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class TaskSchedule extends Model {
/**
     *@param {models} models
     */
    static associate(models) {
      // define association here
    }
  }
  TaskSchedule.init({
    task_id: DataTypes.INTEGER,//assoc
    assigned_to: DataTypes.INTEGER,//assoc //task a deja un assigned 
    store_id: DataTypes.INTEGER,//assoc
    scheduled_date: DataTypes.DATE,
    start_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    status: DataTypes.STRING,
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'TaskSchedule',
  });
  return TaskSchedule;
};