"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Item extends Model {
    static associate(models) {
      this.belongsTo(models.Category, { foreignKey: "category_id" });
      // this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    }
  }

  //TODO ya plus oumoins doublon avec labeledItem
  Item.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      weight: DataTypes.DECIMAL,
      // category_id: DataTypes.INTEGER,//assoc
      barcode: DataTypes.STRING,
      purchase_price: DataTypes.DECIMAL,
      selling_price: DataTypes.DECIMAL,
      status: { type: DataTypes.STRING, defaultValue: "available" },
      // recyclery_id: DataTypes.INTEGER//assoc
    },
    {
      sequelize,
      modelName: "Item",
    }
  );
  return Item;
};
