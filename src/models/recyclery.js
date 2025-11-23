"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Recyclery extends Model {
/**
     *@param {models} models
     */
    static associate(models) {
      this.hasMany(models.LabeledItem, { foreignKey: "recyclery_id" });
      this.hasMany(models.Donation, { foreignKey: "recyclery_id" });
      this.hasMany(models.CollectionSchedule, { foreignKey: "recyclery_id" });
      this.hasMany(models.StoreHours, { foreignKey: "store_id", as: "horaires" })

      this.belongsToMany(models.User, {
        through: "employee_recyclery",
        foreignKey: "store_id",
        as: "employees",
      });

      this.belongsTo(models.User, {
        foreignKey: "manager_id",
        as: "manager",
      });
      this.hasMany(models.CashRegister, {
        foreignKey: "recyclery_id",
        as: "caisses",
      });
    }
  }
  Recyclery.init(
    {
      name: DataTypes.STRING,
      address: DataTypes.TEXT,
      phone: DataTypes.STRING,
      email: DataTypes.STRING,
      city: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
      sequelize,
      modelName: "Recyclery",
    }
  );
  return Recyclery;
};
