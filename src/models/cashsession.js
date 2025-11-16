"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CashSession extends Model {

    static associate(models) {
      this.belongsTo(models.CashRegister, { foreignKey: "cash_register_id" });
      this.hasMany(models.SalesTransaction, { foreignKey: "sale_id" });
      this.belongsTo(models.User, { foreignKey: "user_id" });
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" })
    }
  }
  CashSession.init(
    {
      session_number: DataTypes.STRING, //could be id
      opening_amount: DataTypes.DECIMAL,
      closing_amount: DataTypes.DECIMAL,
      expected_amount: DataTypes.DECIMAL, //computed field ?
      difference_amount: DataTypes.DECIMAL, //computed field ?
      status: { type: DataTypes.ENUM("open", "close"), defaultValue: "open" }, //tant que closed at existe pas status == open else open==false so => isOpen ? compouted ?
      notes: DataTypes.TEXT,
      // opened_at DATETIME DEFAULT CURRENT_TIMESTAMP, //createdAt
      closed_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CashSession",
    }
  );
  return CashSession;
};
