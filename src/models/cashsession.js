"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CashSession extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.CashRegister, { foreignKey: "cash_register_id" });
      this.hasMany(models.SalesTransaction, { foreignKey: "cash_session_id" });
      this.belongsTo(models.User, { foreignKey: "user_id" });
      // this.belongsTo(models.Recyclery, { foreignKey: "store_id" });//peut trouver en remontant from caisse
    }
  }
  CashSession.init(
    {
      // session_number: DataTypes.STRING, //could be id
      opening_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      closing_amount: DataTypes.DECIMAL(10, 2),
      expected_amount: DataTypes.DECIMAL(10, 2), //computed field ?
      difference_amount: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.status === "open") return 0;
          const closing = Number(this.closing_amount) || 0;
          const expected = Number(this.expected_amount) || 0;
          return closing - expected;
        },
      },
      isOpen: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.status === "open";
        },
      },
      status: { type: DataTypes.ENUM("open", "close"), defaultValue: "open" }, //tant que closed at existe pas status == open else open==false so => isOpen ? compouted ?
      notes: DataTypes.TEXT,
      // opened_at DATETIME DEFAULT CURRENT_TIMESTAMP, //createdAt
      closed_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CashSession",
      indexes: [
        { fields: ["cash_register_id"] },
        { fields: ["user_id", "status"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );
  return CashSession;
};
