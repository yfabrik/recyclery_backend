"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Skill extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsToMany(models.Employee, {
        foreignKey: "skillId",
        as: "employees",
        through: "employee_skill",
      });
    }
  }
  Skill.init(
    {
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      isActive:{type:DataTypes.BOOLEAN,defaultValue:true},
      description:{type:DataTypes.TEXT}
    },
    {
      sequelize,
      modelName: "Skill",
    },
  );
  return Skill;
};
