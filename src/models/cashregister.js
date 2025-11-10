"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CashRegister extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // this.belongsTo(models.Store, { foreignKey: "store_id" });
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
      // store_id: DataTypes.INTEGER, //assoc
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CashRegister",
    }
  );
  return CashRegister;
};
