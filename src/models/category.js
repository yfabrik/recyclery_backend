"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Category extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Category, {
        as: "subcategories",
        foreignKey: "parent_id",
      });
      this.belongsTo(models.Category, { as: "parent", foreignKey: "parent_id" });
      this.hasMany(models.LabeledItem, { foreignKey: "category_id" });//TODO item et labeleditem c'est des doublons ?
    }
  }
  Category.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      icon: DataTypes.STRING,
      // parent_id: DataTypes.INTEGER,//assoc
    },
    {
      sequelize,
      modelName: "Category",
    }
  );
  return Category;
};
