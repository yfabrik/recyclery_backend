import createHttpError from "http-errors";
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
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Category from "./category.ts";
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";
import type TransactionItem from "./transactionitem.js";
import {
  CONDITION_STATES,
  LABELED_ITEM_STATUSES,
  type ConditionState,
  type LabeledItemStatus,
} from "../constants/dbEnums.js";

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
  declare condition_state: CreationOptional<ConditionState>;
  declare status: CreationOptional<LabeledItemStatus>;

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
  declare transactions?: Array<
    SalesTransaction & { TransactionItem?: NonAttribute<TransactionItem> }
  >;
  // declare TransactionItem?: NonAttribute<TransactionItem>

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
      foreignKey:{ name:"category_id",allowNull: false},
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.Category, {
      as: "subcategory",
      foreignKey: "subcategory_id",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.Recyclery, {
      as: "recyclery",
      foreignKey: "recyclery_id",
    });
    this.belongsTo(models.User, {
      as: "createdBy",
      foreignKey: { name: "created_by", allowNull: true },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.SalesTransaction, {
      through: models.TransactionItem,
      foreignKey: "labeled_item_id",
      otherKey: "transaction_id",
      as: "transactions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
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
        //@ts-expect-error  sequelize virtual marqued as nonattribute
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
          type: DataTypes.ENUM(...CONDITION_STATES),
          defaultValue: "good",
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...LABELED_ITEM_STATUSES),
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
        hooks: {
          beforeDestroy: async (item) => {
            if (item.status !== "available") {
              throw new createHttpError[424](
                "Impossible de supprimer un article non disponible",
              );
            }
            const TransactionItem = item.sequelize.models
              .TransactionItem as ModelStatic<TransactionItem>;
            const linked = await TransactionItem.count({
              where: { labeled_item_id: item.id },
            });
            if (linked > 0) {
              throw new createHttpError[424](
                "Impossible de supprimer un article lié à une vente",
              );
            }
          },
        },
      },
    );
  }
}
