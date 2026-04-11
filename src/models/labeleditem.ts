import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Category from "./category.ts";
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";

export default class LabeledItem extends Model<
  InferAttributes<LabeledItem>,
  InferCreationAttributes<LabeledItem>
> {
  declare id: CreationOptional<number>;
  declare barcode: NonAttribute<string>;
  declare description: CreationOptional<string | null>;
  declare weight: number;
  declare price: number;
  declare cost: CreationOptional<number | null>;
  declare condition_state: CreationOptional<
    "excellent" | "good" | "fair" | "poor"
  >;
  declare status: CreationOptional<"available" | "sold">;

  declare category_id: ForeignKey<Category["id"]>;
  declare subcategory_id: ForeignKey<Category["id"] | null>;
  declare recyclery_id: ForeignKey<Recyclery["id"] | null>;
  declare created_by: ForeignKey<User["id"] | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare category?: NonAttribute<Category>;
  declare subcategory?: NonAttribute<Category>;
  declare recyclery?: NonAttribute<Recyclery>;
  declare createdBy?: NonAttribute<User>;
  declare transactions?: NonAttribute<SalesTransaction[]>;

  declare getCategory: BelongsToGetAssociationMixin<Category>;
  declare setCategory: BelongsToSetAssociationMixin<Category, Category["id"]>;
  declare getSubcategory: BelongsToGetAssociationMixin<Category>;
  declare setSubcategory: BelongsToSetAssociationMixin<
    Category,
    Category["id"]
  >;
  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getCreatedBy: BelongsToGetAssociationMixin<User>;
  declare setCreatedBy: BelongsToSetAssociationMixin<User, User["id"]>;
  declare getTransactions: BelongsToManyGetAssociationsMixin<SalesTransaction>;
  declare setTransactions: BelongsToManySetAssociationsMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare addTransaction: BelongsToManyAddAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare addTransactions: BelongsToManyAddAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;

  static associate(models: ModelStatics) {
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
    this.belongsTo(models.User, { as: "createdBy", foreignKey: "created_by" });
    this.belongsToMany(models.SalesTransaction, {
      through: models.TransactionItem,
      foreignKey: "labeled_item_id",
      otherKey: "transaction_id",
      as: "transactions",
    });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        //@ts-expect-error
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
          allowNull: false,
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
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("available", "sold"),
          defaultValue: "available",
          allowNull: false,
        },

        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "LabeledItem",
        indexes: [
          { fields: ["status"] },
          { fields: ["recyclery_id"] },
          { fields: ["category_id"] },
        ],
      },
    );
  }
}
