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
      Recyclery.hasMany(models.User, { foreignKey: "recyclery_id" });
      Recyclery.hasMany(models.Item, { foreignKey: "recyclery_id" });
      Recyclery.hasMany(models.Donation, { foreignKey: "recyclery_id" });
      Recyclery.hasMany(models.Collection, { foreignKey: "recyclery_id" });
      Recyclery.belongsTo(models.User, { as: "manager", foreignKey: "manager_id" });
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
