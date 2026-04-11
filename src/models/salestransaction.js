"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class SalesTransaction extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      // this.hasMany(models.TransactionItem, { foreignKey: "transaction_id" });
      this.belongsTo(models.User, { foreignKey: "created_by" });
      this.belongsTo(models.CashSession, { foreignKey: "cash_session_id" });
      this.belongsToMany(models.LabeledItem, {
        through: models.TransactionItem,
        foreignKey: "transaction_id",
        otherKey: "labeled_item_id",
        as: "items",
      });
      this.hasMany(models.SalesTransaction, {
        foreignKey: "transactionId",
        as: "refunds",
      });
      this.belongsToMany(models.GiftCard, {
        through: models.GiftCardTransaction,
        foreignKey: "sales_transaction_id",
        otherKey: "gift_card_id",
        as: "giftCards",
      });
      this.hasMany(models.GiftCardTransaction, {
        foreignKey: "sales_transaction_id",
        as: "giftCardMovements",
      });
      this.hasMany(models.TransactionPayment, {
        foreignKey: "sales_transaction_id",
        as: "payments",
      });
      this.hasMany(models.GiftCard, {
        as: "issuedGiftCards",
        foreignKey: "issued_transaction_id",
      });
      this.hasMany(models.GiftCard, {
        as: "refundIssuedGiftCards",
        foreignKey: "issued_refund_transaction_id",
      });
    }
  }
  SalesTransaction.init(
    {
      // transaction_number: DataTypes.STRING, //id ??? //assoc ???
      // cash_session_id: DataTypes.INTEGER, //assoc
      // store_id: DataTypes.INTEGER, //assoc
      total_amount: DataTypes.DECIMAL(10, 2), //virtual ?
      payment_method: DataTypes.ENUM(
        "cash",
        "card",
        "check",
        "giftcard",
        "mixed",
      ),
      transactionType: {
        type: DataTypes.ENUM("sell", "refund"),
        defaultValue: "sell",
      },
      payment_amount: DataTypes.DECIMAL(10, 2),

      change_amount: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.payment_amount - this.total_amount;
        },
      },
      customer_name: DataTypes.STRING,
      customer_email: DataTypes.STRING,
      customer_postal_code: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled"),
        defaultValue: "completed",
      },
      // refunded_amount: DataTypes.DECIMAL, //??????
      // created_by: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "SalesTransaction",
      indexes: [
        { fields: ["cash_session_id"] },
        { fields: ["createdAt"] },
        { fields: ["status"] },
      ],
    },
  );
  return SalesTransaction;
};
