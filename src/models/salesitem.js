"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class SalesItem extends Model {
/**
     *@param {models} models
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
      this.belongsTo(models.LabeledItem, { foreignKey: "labeled_item_id" });

    }
  }

  //comprend pas tros l(interet) ça a l'air  de faire item par item donc pour quoi quantity et total, le reste existe deja dans item
  SalesItem.init(
    {
      // transaction_id: DataTypes.INTEGER, //assoc
      // labeled_item_id: DataTypes.INTEGER, //assoc
      // barcode: DataTypes.STRING, //item a un barcode
      name: DataTypes.STRING, //item a un name
      price: DataTypes.DECIMAL,
      quantity: DataTypes.INTEGER,
      total_price: DataTypes.DECIMAL,
    },
    {
      sequelize,
      modelName: "SalesItem",
    }
  );
  return SalesItem;
};
