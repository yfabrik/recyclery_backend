"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EmployeeWorkdays extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      // this.belongsTo(models.User, { foreignKey: "employee_id" });
      this.belongsTo(models.Employee,{ foreignKey: "employee_id" });
    }
  }
  EmployeeWorkdays.init(
    {
      day_of_week: DataTypes.STRING,
      time_slot: DataTypes.STRING,
      is_working: DataTypes.BOOLEAN,
      start_time: DataTypes.TIME,
      end_time: DataTypes.STRING,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "EmployeeWorkdays",
      indexes: [
        { fields: ["employee_id"] },
        { fields: ["employee_id", "day_of_week"] },
      ],
    },
  );
  return EmployeeWorkdays;
};
