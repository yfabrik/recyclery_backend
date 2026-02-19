"use strict";
import createHttpError from "http-errors";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CashRegister extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.hasMany(models.CashSession, {
        foreignKey: "cash_register_id",
        as: "sessions",
        onDelete: "CASCADE",
      });
    }
  }
  CashRegister.init(
    {
      name: { type: DataTypes.STRING, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CashRegister",
      indexes: [
        { fields: ["recyclery_id"] },
        { fields: ["recyclery_id", "name"], unique: true },
      ],
      hooks: {
        beforeDestroy: async (caisse) => {
          const sessions = await caisse.countSessions({
            where: { status: "open" },
          });
          if (sessions)
            throw new createHttpError[424](
              "Impossible de supprimer une caisse avec des sessions ouvertes",
            );
        },
      },
    },
  );
  return CashRegister;
};
