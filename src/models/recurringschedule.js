'use strict';
import { Model } from 'sequelize';
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class RecurringSchedule extends Model {
/**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      // define association here
    }
  }

  //TODO doublon avec TaskSchedule ?
  RecurringSchedule.init({
    task_id: DataTypes.INTEGER,//assoc
    assigned_to: DataTypes.INTEGER,//assoc
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    day_of_week: DataTypes.INTEGER,
    start_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'RecurringSchedule',
  });
  return RecurringSchedule;
};