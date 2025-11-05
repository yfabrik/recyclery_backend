"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Item extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Category, { foreignKey: "category_id" });
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    }
  }
  Item.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
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
