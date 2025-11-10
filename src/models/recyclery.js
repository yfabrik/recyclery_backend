"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Recyclery extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // this.hasMany(models.User, { foreignKey: "recyclery_id" });
      this.hasMany(models.LabeledItem, { foreignKey: "recyclery_id" });
      this.hasMany(models.Donation, { foreignKey: "recyclery_id" });
      this.hasMany(models.Collection, { foreignKey: "recyclery_id" });
      // this.belongsTo(models.User, { as: "manager", foreignKey: "manager_id" });

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
      // manager_id: DataTypes.INTEGER,//assoc
    },
    {
      sequelize,
      modelName: "Recyclery",
    }
  );
  return Recyclery;
};
