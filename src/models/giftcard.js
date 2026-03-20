"use strict";
import { Model } from "sequelize";

/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class GiftCard extends Model {
    /**
     * @param {import("./types/models.js").models} models
     */
    static associate(models) {
      this.belongsTo(models.SalesTransaction, {
        as: "issuedTransaction",
        foreignKey: "issued_transaction_id",
      });
      this.belongsTo(models.SalesTransaction, {
        as: "issuedRefundTransaction",
        foreignKey: "issued_refund_transaction_id",
      });
      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "created_by",
      });
      this.belongsToMany(models.SalesTransaction, {
        through: models.GiftCardTransaction,
        foreignKey: "gift_card_id",
        otherKey: "sales_transaction_id",
        as: "transactions",
      });
      this.hasMany(models.GiftCardTransaction, {
        foreignKey: "gift_card_id",
        as: "movements",
      });
      this.hasMany(models.TransactionPayment, {
        foreignKey: "gift_card_id",
        as: "paymentUsages",
      });
    }
  }

  GiftCard.init(
    {
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      initial_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      current_value: {
        type: DataTypes.VIRTUAL,
        get() {
          return this?.movements?.reduce((prev, current) => prev += current.amount, 0) ?? this.initial_value
        }
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "active",
          "partially_used",
          "redeemed",
          "expired",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "active",
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "EUR",
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      issued_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      issued_refund_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recipient_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      recipient_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GiftCard",
      validate: {
        singleIssuanceOrigin() {
          if (
            this.issued_transaction_id != null &&
            this.issued_refund_transaction_id != null
          ) {
            throw new Error(
              "A gift card can only have one issuance origin transaction",
            );
          }
        },
      },
      hooks: {
        //TODO here or in giftcard trnasaction
        //update status at each transaction
      },
      indexes: [
        { unique: true, fields: ["code"] },
        { fields: ["status"] },
        { fields: ["expires_at"] },
      ],
    },
  );

  return GiftCard;
};
