"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.hasMany(models.Donation, { foreignKey: "received_by" });
      this.hasMany(models.Collection, { foreignKey: "assigned_to" });
      this.hasMany(models.Sale, { foreignKey: "sold_by" });
      this.hasMany(models.CollectionSchedule, { foreignKey: "employee_id" });
      this.hasMany(models.CollectionReceipt, { foreignKey: "processed_by" });
      this.hasMany(models.LabeledItem, { foreignKey: "created_by" });
      this.hasMany(models.Task, { foreignKey: "assigned_to" });
      this.belongsToMany(models.Store, {
        through: "EmployeeStore",
        foreignKey: "employee_id",
      });
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      role: {
        type: DataTypes.STRING, //TODO foreignkey role
        defaultValue: "employee",
      },
      // recyclery_id: DataTypes.INTEGER, //assoc
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
