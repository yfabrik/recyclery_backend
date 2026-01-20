"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class User extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.hasMany(models.Donation, { foreignKey: "received_by" });
      // this.hasMany(models.Collection, { foreignKey: "assigned_to" });
      this.hasMany(models.SalesTransaction, { foreignKey: "sold_by" });
      // this.belongsToMany(models.CollectionSchedule, { foreignKey: "employee_id", through: "user_schedule" });
      this.hasMany(models.CollectionReceipt, { foreignKey: "processed_by" });
      this.hasMany(models.LabeledItem, { foreignKey: "created_by" });
      // this.belongsToMany(models.Task, { through: "task_user" });
      this.hasMany(models.Arrival, { foreignKey: "processed_by" })
      // this.belongsToMany(models.TaskSchedule,{through:"taskSchedule_employee",foreignKey:"employee_id"})
      // this.hasMany(models.TaskSchedule, { foreignKey: "assigned_to" })


      // this.belongsToMany(models.Recyclery, {
      //   through: "EmployeeStore",
      //   foreignKey: "employee_id",
      //   as: "stores",
      // });
      this.hasMany(models.Recyclery, {
        foreignKey: "manager_id",
        as: "managedStores",
      });
      // this.hasMany(models.EmployeeWorkdays, { foreignKey: "employee_id" })
    }
  }
  User.init(
    {
      username: {type:DataTypes.STRING,unique:true},
      email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
      password: DataTypes.STRING,
      role: {
        type: DataTypes.STRING, //TODO foreignkey role
        defaultValue: "employee",
      },
      phone:{ type: DataTypes.STRING, validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ } },
      contract_hours: { type: DataTypes.INTEGER, defaultValue: 35 },//peut etre obtenu from employee workday ?
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      last_login: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "User",
      defaultScope: {
        attributes: {
          exclude: ["password"]
        }
      },
      scopes: {
        withPassword: {
          attributes: {
            include: ['password']
          }
        }
      }
    }
  );
  return User;
};

