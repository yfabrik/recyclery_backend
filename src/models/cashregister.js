"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CashRegister extends Model {
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.hasMany(models.CashSession, {
        foreignKey: "session_id",
        as: "sessions",
      });
    }
  }
  CashRegister.init(
    {
      name: DataTypes.STRING,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CashRegister",
    }
  );
  return CashRegister;
};
