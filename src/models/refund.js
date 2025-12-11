"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Refund extends Model {
/**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: "created_by" })
      this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" })
    }
  }
  Refund.init(
    {
      // transaction_id: DataTypes.INTEGER, //assoc
      reason: DataTypes.STRING,
      refund_amount: DataTypes.DECIMAL,
      notes: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled"),
        defaultValue: "completed",
        allowNull: false,
      },
      refund_type: DataTypes.ENUM("full", "partial"),
      refund_method: DataTypes.ENUM("cash", "card", "check"),
    },
    {
      sequelize,
      modelName: "Refund",
    }
  );
  return Refund;
};
