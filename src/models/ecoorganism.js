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
      // define association here
    }
  }
  EcoOrganism.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    contact_email: DataTypes.STRING,
    contact_phone: DataTypes.STRING,
    address: DataTypes.STRING,
    website: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'EcoOrganism',
  });
  return EcoOrganism;
};