"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Employee extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsToMany(models.Recyclery, {
        through: models.EmployeeStore,
        as: "stores",
      });
      this.belongsToMany(models.Task, { through: "employee_task" });
      this.belongsToMany(models.TaskSchedule, { through: "employee_schedule" });
      this.hasMany(models.EmployeeWorkdays, { 
        foreignKey: "employee_id", 
        // as: "horaires" 
      });
    }
  }
  Employee.init(
    {
      nom: { type: DataTypes.STRING, allowNull: false },
      prenom: { type: DataTypes.STRING, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.nom} ${this.prenom}`;
        },
      },
      phone: DataTypes.STRING,
      email: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Employee",
    },
  );
  return Employee;
};
