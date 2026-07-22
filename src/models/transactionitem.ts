import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { ModelStatics } from "./db-types.ts";
import type LabeledItem from "./labeleditem.ts";
import type SalesTransaction from "./salestransaction.ts";
import { withTransaction } from "../utils/transaction.js";

export default class TransactionItem extends Model<
  InferAttributes<TransactionItem>,
  InferCreationAttributes<TransactionItem>
> {
  declare name: string;
  declare price: number;
  declare quantity: CreationOptional<number>;
  declare promotionValue: CreationOptional<number>;
  declare bundleQuantity: CreationOptional<number | null>;
  declare bundlePrice: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare total_price: NonAttribute<number>;

  declare transaction_id: ForeignKey<SalesTransaction["id"]>;
  declare labeled_item_id: ForeignKey<LabeledItem["id"]>;

  declare SalesTransaction?: NonAttribute<SalesTransaction>;
  declare LabeledItem?: NonAttribute<LabeledItem>;

  declare getSalesTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setSalesTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getLabeledItem: BelongsToGetAssociationMixin<LabeledItem>;
  declare setLabeledItem: BelongsToSetAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;

  static associate(models: ModelStatics) {
    this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
    this.belongsTo(models.LabeledItem, { foreignKey: "labeled_item_id" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        name: { type: DataTypes.STRING, allowNull: false },
        price: { type: DataTypes.DECIMAL, allowNull: false },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            min: 1,
          },
        },
        //@ts-expect-error  sequelize virtual marqued as nonattribute
        total_price: {
          type: DataTypes.VIRTUAL,
          get(this) {
            let bundles = 0;
            let extraItems = this.quantity ?? 0;
            const bq = this.bundleQuantity;
            if (bq && bq !== 0) {
              bundles = Math.trunc(extraItems / bq);
              extraItems = extraItems % bq;
            }
            const promotionNum = Number(this.promotionValue ?? 0);
            const sum = (price: number, quantity: number) =>
              price * quantity * (1 - promotionNum / 100);
            const priceNum = Number(this.price ?? 0);
            const bundleP =
              this.bundlePrice != null ? Number(this.bundlePrice) : priceNum;
            return sum(priceNum, extraItems) + sum(bundleP, bundles);
          },
        },
        promotionValue: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0, max: 100 },
        },
        transaction_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        labeled_item_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        bundleQuantity: { type: DataTypes.INTEGER, allowNull: true },
        bundlePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "TransactionItem",
        tableName: "transaction_items",
        hooks: {
          beforeCreate: (_instance, _options) => {
          },
          afterCreate: (_instance, _options) => {
          },
          afterDestroy: async (instance, options) => {
            await withTransaction(
              instance.sequelize!,
              options.transaction,
              async (tx) => {
                const item = await instance.getLabeledItem({
                  transaction: tx,
                });
                if (!item) return;
                await item.update({ status: "available" }, { transaction: tx });
              },
            );
          },
        }
      },
    );
  }
}
