"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Inventory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Item, { foreignKey: "item_id" });
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    }
  }
  Inventory.init(
    {
      // item_id: DataTypes.INTEGER, //assoc
      quantity: DataTypes.INTEGER,
      location: DataTypes.STRING,
      // recyclery_id: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "Inventory",
    }
  );
  return Inventory;
};
