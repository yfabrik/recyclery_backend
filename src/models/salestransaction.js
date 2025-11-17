"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class SalesTransaction extends Model {
    static associate(models) {
      this.hasMany(models.SalesItem, { foreignKey: "transaction_id" });
      this.belongsTo(models.User, { foreignKey: "created_by" });
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      this.belongsTo(models.CashSession, { foreignKey: "cash_session_id" });
    }
  }
  SalesTransaction.init(
    {
      transaction_number: DataTypes.STRING, //id ??? //assoc ???
      // cash_session_id: DataTypes.INTEGER, //assoc
      // store_id: DataTypes.INTEGER, //assoc
      total_amount: DataTypes.DECIMAL,
      payment_method: DataTypes.STRING,
      payment_amount: DataTypes.DECIMAL,
      change_amount: DataTypes.DECIMAL,
      customer_name: DataTypes.STRING,
      customer_email: DataTypes.STRING,
      customer_postal_code: DataTypes.STRING,
      status: DataTypes.STRING,
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
