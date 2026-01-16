"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class LabeledItem extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Category, {
        as: "category",
        foreignKey: "category_id",

      });

      // this.belongsTo(models.Category, {
      //   as: "subcategory",
      //   foreignKey: "subcategory_id",
      // });

      this.belongsTo(models.Recyclery, {
        as: "recyclery",
        foreignKey: "recyclery_id",
      });

      // this.belongsTo(models.Arrival, {
      //   as: "arrival",
      //   foreignKey: "arrival_id",
      // });

      this.belongsTo(models.User, {
        as: "soldBy",
        foreignKey: "sold_by",
      });//TODO needed ? peut retrouvé depuis transaction

      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "created_by",
      });
      this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
    }
  }
  LabeledItem.init(
    {
      barcode: DataTypes.STRING,
      // name: DataTypes.STRING,
      description: DataTypes.TEXT,
      weight: DataTypes.DECIMAL(10, 2),
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      cost: { type: DataTypes.DECIMAL(10, 2) },
      condition_state: { type: DataTypes.ENUM("excellent", "good", "fair", "poor"), defaultValue: "good" },
      // location: DataTypes.STRING,
      status: { type: DataTypes.ENUM("available", "sold"), defaultValue: "available" },
      // sold_at: DataTypes.DATE, //assoc ???
    },
    {
      sequelize,
      modelName: "LabeledItem",
    }
  );
  return LabeledItem;
};
