'use strict';
import { Model } from 'sequelize';
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Role extends Model {
/**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      // define association here
    }
  }
  Role.init({
    level: DataTypes.STRING,
    display_name: DataTypes.STRING,
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Role',
  });
  return Role;
};