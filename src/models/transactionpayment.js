"use strict";
import { Model } from "sequelize";

/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class TransactionPayment extends Model {
    /**
     * @param {import("./types/models.js").models} models
     */
    static associate(models) {
      this.belongsTo(models.SalesTransaction, {
        foreignKey: "sales_transaction_id",
      });
      this.belongsTo(models.GiftCard, {
        foreignKey: "gift_card_id",
      });
    }
  }

  TransactionPayment.init(
    {
      sales_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      method: {
        type: DataTypes.ENUM("cash", "card", "check", "giftcard"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      gift_card_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "TransactionPayment",
      tableName: "transaction_payments",
      indexes: [
        { fields: ["sales_transaction_id"] },
        { fields: ["method"] },
        { fields: ["gift_card_id"] },
      ],
    },
  );

  return TransactionPayment;
};
