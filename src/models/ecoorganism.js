"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EcoOrganism extends Model {
    /**
         *@param {import ('./types/models.js').models} models
         */
    static associate(models) {
      this.hasMany(models.WasteDisposal)
    }
  }
  EcoOrganism.init({
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    description: DataTypes.STRING,
    contact_email: { type: DataTypes.STRING, validate: { isEmail: true } },
    contact_phone: { type: DataTypes.STRING, validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ } },
    address: DataTypes.STRING,
    website: { type: DataTypes.STRING, validate: { isUrl: true } },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: "EcoOrganism",
    indexes: [{ fields: ["is_active"] }],
  });
  return EcoOrganism;
};
