import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class TransactionItem extends Model<
  InferAttributes<TransactionItem>,
  InferCreationAttributes<TransactionItem>
> {
  declare id: CreationOptional<number>;
  declare name: string | null;
  declare price: string | null;
  declare quantity: number | null;
  declare total_price: number;
  declare promotionValue: string;
  declare bundleQuantity: number | null;
  declare bundlePrice: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
    this.belongsTo(models.LabeledItem, { foreignKey: "labeled_item_id" });
  }

  static initModel(sequelize: Sequelize) {
    TransactionItem.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        price: DataTypes.DECIMAL,
        quantity: DataTypes.INTEGER,
        total_price: {
          type: DataTypes.VIRTUAL,
          get(this: TransactionItem) {
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
            const bundleP = this.bundlePrice != null ? Number(this.bundlePrice) : priceNum;
            return sum(priceNum, extraItems) + sum(bundleP, bundles);
          },
        },
        promotionValue: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0, max: 100 },
        },
        bundleQuantity: { type: DataTypes.INTEGER, allowNull: true },
        bundlePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, modelName: "TransactionItem", tableName: "transaction_items" },
    );
  }
}
