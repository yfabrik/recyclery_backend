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
      this.hasMany(models.SalesItem, { foreignKey: "transaction_id" });
      // this.belongsTo(models.User, { foreignKey: "created_by" });
      // this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      this.belongsTo(models.CashSession, { foreignKey: "cash_session_id" });
      this.hasMany(models.LabeledItem, { foreignKey: "transaction_id" });

    }
  }
  SalesTransaction.init(
    {
      // transaction_number: DataTypes.STRING, //id ??? //assoc ???
      // cash_session_id: DataTypes.INTEGER, //assoc
      // store_id: DataTypes.INTEGER, //assoc
      // total_amount: DataTypes.DECIMAL,//virtual ?
      payment_method: DataTypes.ENUM("cash", "card", "check"),
      transactionType: { type: DataTypes.ENUM("sell", "refund"), defaultValue: "sell" },
      payment_amount: DataTypes.DECIMAL,
      // change_amount: DataTypes.DECIMAL,
      customer_name: DataTypes.STRING,
      customer_email: DataTypes.STRING,
      customer_postal_code: DataTypes.STRING,
      status: DataTypes.ENUM("pending", "completed", "cancelled"),
      refunded_amount: DataTypes.DECIMAL, //??????
      // created_by: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "SalesTransaction",
    }
  );
  return SalesTransaction;
};
