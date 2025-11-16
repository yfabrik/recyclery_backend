"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Refund extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: "created_by" })
      // this.belongTo(models.SaleTransaction, { foreignKey: "transaction_id" })
    }
  }
  Refund.init(
    {
      transaction_id: DataTypes.INTEGER, //assoc
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
