"use strict";
/**
 * @typedef {import('sequelize').Model} Model
 * @typedef {import('sequelize').Sequelize} Sequelize
 */
import { Model } from "sequelize";
/**
 * @param {Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

  /**
   * @param {object} models
   */
    static associate(models) {
      User.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      User.hasMany(models.Donation, { foreignKey: "received_by" });
      User.hasMany(models.Collection, { foreignKey: "assigned_to" });
      User.hasMany(models.Sale, { foreignKey: "sold_by" });
      User.hasMany(models.CollectionSchedule, { foreignKey: "employee_id" });
      User.hasMany(models.CollectionReceipt, { foreignKey: "processed_by" });
      User.hasMany(models.LabeledItem, { foreignKey: "created_by" });
      User.hasMany(models.Task, { foreignKey: "assigned_to" });
      User.belongsToMany(models.Store, {
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
