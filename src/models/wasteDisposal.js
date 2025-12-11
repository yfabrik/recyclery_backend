"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class WasteDisposal extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Category, {
        as: "category",
        foreignKey: "category_id",
      });
      this.belongsTo(models.Category, {
        as: "subcategory",
        foreignKey: "subcategory_id",
      });
      this.belongsTo(models.EcoOrganism, {
        as: "eco_organism",
        foreignKey: "eco_organism_id",
      });
      this.belongsTo(models.User, {
        foreignKey: "created_by",
      });
    }
  }

  WasteDisposal.init(
    {
      disposal_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      disposal_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      disposal_type: {
        type: DataTypes.ENUM("eco_organism", "landfill", "recycling", "other"),
        allowNull: false,
      },
      weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      volume_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      transport_method: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      transport_company: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      transport_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "WasteDisposal",
    }
  );

  return WasteDisposal;
};
