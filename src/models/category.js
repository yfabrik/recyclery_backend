"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Category extends Model {
    /**
         *@param {import ('./types/models.js').models} models
         */
    static associate(models) {
      this.hasMany(models.Category, {
        as: "subcategories",
        foreignKey: "parent_id",
        onDelete: "CASCADE"

      });
      this.belongsTo(models.Category, { as: "parent", foreignKey: "parent_id" });
      this.hasMany(models.LabeledItem, { foreignKey: "category_id" });//TODO item et labeleditem c'est des doublons ?
    }
  }
  Category.init(
    {
      name: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      icon: DataTypes.STRING,
      defaultWeight: { type: DataTypes.FLOAT(), validate: { min: 0 }, defaultValue: 0 },
      defaultPrice: { type: DataTypes.DECIMAL(10, 2), validate: { min: 0 }, defaultValue: 0 }
    },
    {
      sequelize,
      modelName: "Category",
    }
  );
  return Category;
};
