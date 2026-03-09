"use strict";
import { Model } from "sequelize";
/**
 * Junction model for SalesTransaction <-> LabeledItem (many-to-many).
 * Table: transaction_items (snake_case). Association alias: transactionLines.
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class TransactionItem extends Model {
    /**
     * @param {import('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
      this.belongsTo(models.LabeledItem, { foreignKey: "labeled_item_id" });
    }
  }

  TransactionItem.init(
    {
      name: DataTypes.STRING,
      price: DataTypes.DECIMAL,
      quantity: DataTypes.INTEGER,
      total_price: {
        type: DataTypes.VIRTUAL,
        get() {
          let bundles = 0;
          let extraItems = this.quantity;
          if (this.bundleQuantity && this.bundleQuantity !== 0) {
            bundles = Math.trunc(this.quantity / this.bundleQuantity);
            extraItems = this.quantity % this.bundleQuantity;
          }
          const sum = (price, quantity) =>
            price * quantity * (1 - this.promotionValue / 100);
          return (
            sum(this.price, extraItems) +
            sum(this.bundlePrice || this.price, bundles)
          );
        },
      },
      promotionValue: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      bundleQuantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      bundlePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "TransactionItem",
      tableName: "transaction_items",
    },
  );
  return TransactionItem;
};
