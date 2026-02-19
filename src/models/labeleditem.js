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

      this.belongsTo(models.Category, {
        as: "subcategory",
        foreignKey: "subcategory_id",
      });

      this.belongsTo(models.Recyclery, {
        as: "recyclery",
        foreignKey: "recyclery_id",
      });

      // this.belongsTo(models.Arrival, {
      //   as: "arrival",
      //   foreignKey: "arrival_id",
      // });

      // this.belongsTo(models.User, {
      //   as: "soldBy",
      //   foreignKey: "sold_by",
      // });//TODO needed ? peut retrouvé depuis transaction

      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "created_by",
      });
      this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" }); //belong to many for historic and refund ?
    }
  }
  LabeledItem.init(
    {
      barcode: {
        type: DataTypes.VIRTUAL,
        get() {
          return String(this.id).padStart(12, "0");
        },
      },
      description: DataTypes.TEXT,
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        validate: { min: 0 },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      cost: { type: DataTypes.DECIMAL(10, 2) },
      condition_state: {
        type: DataTypes.ENUM("excellent", "good", "fair", "poor"),
        defaultValue: "good",
      },
      status: {
        type: DataTypes.ENUM("available", "sold"),
        defaultValue: "available",
      },
      // sold_at: DataTypes.DATE,//trouvable dans transaction
    },
    {
      sequelize,
      modelName: "LabeledItem",
      indexes: [
        { fields: ["status"] },
        { fields: ["recyclery_id"] },
        { fields: ["category_id"] },
        { fields: ["transaction_id"] },
      ],
      hooks: {
        // beforeCreate(instance) {
        //   if (instance.status === "sold" && !instance.sold_at) instance.sold_at = new Date();
        // },
        // beforeUpdate(instance) {
        //   if (instance.changed("status") && instance.status === "sold" && !instance.sold_at) {
        //     instance.sold_at = new Date();
        //   }
        // },
      },
    },
  );
  return LabeledItem;
};
