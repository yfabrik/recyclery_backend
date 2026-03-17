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
      this.belongsToMany(models.Skill, {
        foreignKey: "employeeId",
        through: "employee_skill",
        as: "skills",
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
        /**
         * @this {import("./types/employeeModel.js").EmployeeInstance}
         * @returns
         */
        get() {
          return `${this.nom} ${this.prenom}`;
        },
      },
      workTime: {
        type: DataTypes.VIRTUAL,
        /**
         * @this {import("./types/employeeModel.js").EmployeeInstance}
         * @returns
         */
        get() {
          if (!this.EmployeeWorkdays) return;
          const minutes = this.EmployeeWorkdays.reduce((prev, current) => {
            const start = current.start_time.split(":");
            const end = current.end_time.split(":");
            const time =
              Number(end[0]) * 60 +
              Number(end[1]) -
              (Number(start[0]) * 60 + Number(start[1]));
            // const time = (+end[0] - +start[0]) * 60 - (+end[1] - +start[1]);
            prev += time;
            return prev;
          }, 0);
          return minutes / (60 * 2);
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
