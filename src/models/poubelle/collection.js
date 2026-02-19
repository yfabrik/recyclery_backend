"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Collection extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: "assigned_to" });
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    }
  }
  Collection.init(
    {
      collection_date: DataTypes.DATE,
      address: DataTypes.TEXT,
      contact_name: DataTypes.STRING,
      contact_phone: DataTypes.STRING,
      description: DataTypes.TEXT,
      status: { type: DataTypes.STRING, defaultValue: "scheduled" },
      // assigned_to: DataTypes.INTEGER, //assoc
      // recyclery_id: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "Collection",
    },
  );
  return Collection;
};
