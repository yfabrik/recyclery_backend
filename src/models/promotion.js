"use strict";
import { Model } from "sequelize";
/**
 * Promotion period for a category (replaces isInPromotion/promotionValue on Category).
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Promotion extends Model {
    /**
     * @param {import('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Category, { foreignKey: "category_id" });
    }
  }
  Promotion.init(
    {
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      promotionValue: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
    },
    {
      sequelize,
      modelName: "Promotion",
      indexes: [
        { fields: ["category_id"] },
        { fields: ["startDate", "endDate"] },
      ],
    },
  );
  return Promotion;
};
