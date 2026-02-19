"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class SaleItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Sale, { foreignKey: "sale_id" });
      this.belongsTo(models.Item, { foreignKey: "item_id" });
    }
  }
  //TODO table through pas besoin de la garder ?
  SaleItem.init(
    {
      // sale_id: DataTypes.INTEGER,//assoc
      // item_id: DataTypes.INTEGER,//assoc
      quantity: DataTypes.INTEGER,
      unit_price: DataTypes.DECIMAL, //TODO osef? item a un prix deja
    },
    {
      sequelize,
      modelName: "SaleItem",
    },
  );
  return SaleItem;
};
