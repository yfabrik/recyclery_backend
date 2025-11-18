"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Donation, { foreignKey: "received_by" });
      // this.hasMany(models.Collection, { foreignKey: "assigned_to" });
      this.hasMany(models.SalesTransaction, { foreignKey: "sold_by" });
      this.belongsToMany(models.CollectionSchedule, { foreignKey: "employee_id", through: "user_schedule" });
      this.hasMany(models.CollectionReceipt, { foreignKey: "processed_by" });
      this.hasMany(models.LabeledItem, { foreignKey: "created_by" });
      this.belongsToMany(models.Task, { through: "task_user" });

      this.belongsToMany(models.Recyclery, {
        through: "employee_recyclery",
        foreignKey: "employee_id",
        as: "recycleries",
      });
      this.hasMany(models.Recyclery, {
        foreignKey: "manager_id",
        as: "managedStores",
      });
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
      password: DataTypes.STRING,
      role: {
        type: DataTypes.STRING, //TODO foreignkey role
        defaultValue: "employee",
      },
      phone: DataTypes.STRING,
      contract_hours: { type: DataTypes.INTEGER, defaultValue: 35 },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
