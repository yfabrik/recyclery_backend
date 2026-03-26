import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class LabeledItem extends Model<InferAttributes<LabeledItem>, InferCreationAttributes<LabeledItem>> {
  declare id: CreationOptional<number>;
  declare barcode: string;
  declare description: string | null;
  declare weight: string;
  declare price: string;
  declare cost: string | null;
  declare condition_state: "excellent" | "good" | "fair" | "poor";
  declare status: "available" | "sold";
  declare category_id: ForeignKey<number | null>;
  declare subcategory_id: ForeignKey<number | null>;
  declare recyclery_id: ForeignKey<number | null>;
  declare created_by: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.Category, { as: "category", foreignKey: "category_id" });
    this.belongsTo(models.Category, { as: "subcategory", foreignKey: "subcategory_id" });
    this.belongsTo(models.Recyclery, { as: "recyclery", foreignKey: "recyclery_id" });
    this.belongsTo(models.User, { as: "createdBy", foreignKey: "created_by" });
    this.belongsToMany(models.SalesTransaction, {
      through: models.TransactionItem,
      foreignKey: "labeled_item_id",
      otherKey: "transaction_id",
      as: "transactions",
    });
  }

  static initModel(sequelize: Sequelize) {
    LabeledItem.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        barcode: {
          type: DataTypes.VIRTUAL,
          get(this: LabeledItem) {
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
        category_id: DataTypes.INTEGER,
        subcategory_id: DataTypes.INTEGER,
        recyclery_id: DataTypes.INTEGER,
        created_by: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "LabeledItem",
        indexes: [{ fields: ["status"] }, { fields: ["recyclery_id"] }, { fields: ["category_id"] }],
      },
    );
  }
}
