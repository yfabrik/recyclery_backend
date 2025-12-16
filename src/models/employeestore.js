"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EmployeeStore extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Recyclery,{foreignKey:"store_id"})
      this.belongsTo(models.User,{foreignKey:"employee_id"})
      
    }
  }

  // TABLE JOIN TABLE
  EmployeeStore.init(
    {
      is_primary: {type:DataTypes.BOOLEAN, defaultValue:false}, //assoc ? user peut avoir plusieur recyclerie assigné
    },
    {
      sequelize,
      modelName: "EmployeeStore",
    }
  );
  return EmployeeStore;
};
