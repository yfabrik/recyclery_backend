"use strict";
import { Model } from "sequelize";

/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class GiftCardTransaction extends Model {
    /**
     * @param {import("./types/models.js").models} models
     */
    static associate(models) {
      this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
      this.belongsTo(models.SalesTransaction, {
        foreignKey: "sales_transaction_id",
      });
      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "created_by",
      });
    }
  }

  GiftCardTransaction.init(
    {
      gift_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sales_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "issue",
          "charge",
          "refund_recredit",
          "manual_adjustment",
          "expire",
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          notZero(value) {
            if (Number(value) === 0) {
              throw new Error("amount must be non-zero");
            }
          },
        },
      },
      occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_by: {
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
      modelName: "GiftCardTransaction",
      tableName: "giftcard_transactions",
      indexes: [
        { fields: ["gift_card_id", "occurred_at"] },
        { fields: ["sales_transaction_id"] },
      ],
    },
  );

  return GiftCardTransaction;
};
