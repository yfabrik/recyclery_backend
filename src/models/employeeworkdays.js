"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EmployeeWorkdays extends Model {
/**
     *@param {models} models
     */
    static associate(models) {
      // define association here
    }
  }
  EmployeeWorkdays.init({
    day_of_week: DataTypes.STRING,
    time_slot: DataTypes.STRING,
    is_working: DataTypes.BOOLEAN,
    start_time: DataTypes.TIME,
    end_time: DataTypes.STRING,
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'EmployeeWorkdays',
  });
  return EmployeeWorkdays;
};