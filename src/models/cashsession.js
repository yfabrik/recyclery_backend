"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CashSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.CashRegister, { foreignKey: "cash_register_id" });
      this.hasMany(models.Sale, { foreignKey: "sale_id" });
      this.belongsTo(models.User,{foreignKey:"user_id"})
    }
  }
  CashSession.init(
    {
      session_number: DataTypes.STRING, //could be id
      // cash_register_id: DataTypes.INTEGER,//relation
      // user_id: DataTypes.INTEGER, //relation
      store_id: DataTypes.INTEGER, //relation
      opening_amount: DataTypes.DECIMAL,
      closing_amount: DataTypes.DECIMAL,
      expected_amount: DataTypes.DECIMAL, //computed field ?
      difference_amount: DataTypes.DECIMAL, //computed field ?
      status: DataTypes.STRING, //tant que closed at existe pas status == open else open==false so => isOpen ? compouted ?
      notes: DataTypes.TEXT,
      // opened_at DATETIME DEFAULT CURRENT_TIMESTAMP, //createdAt
      // closed_at DATETIME,
    },
    {
      sequelize,
      modelName: "CashSession",
    }
  );
  return CashSession;
};
