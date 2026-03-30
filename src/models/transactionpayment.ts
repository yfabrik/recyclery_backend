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

export default class TransactionPayment extends Model<
  InferAttributes<TransactionPayment>,
  InferCreationAttributes<TransactionPayment>
> {
  declare id: CreationOptional<number>;
  declare sales_transaction_id: ForeignKey<number>;
  declare method: "cash" | "card" | "check" | "giftcard";
  declare amount: string;
  declare gift_card_id: ForeignKey<number | null>;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.SalesTransaction, { foreignKey: "sales_transaction_id" });
    this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
  }

  static initModel(sequelize: Sequelize) {
    TransactionPayment.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        sales_transaction_id: { type: DataTypes.INTEGER, allowNull: false },
        method: {
          type: DataTypes.ENUM("cash", "card", "check", "giftcard"),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: { min: 0.01 },
        },
        gift_card_id: { type: DataTypes.INTEGER, allowNull: true },
        metadata: { type: DataTypes.JSON, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "TransactionPayment",
        tableName: "transaction_payments",
        indexes: [
          { fields: ["sales_transaction_id"] },
          { fields: ["method"] },
          { fields: ["gift_card_id"] },
        ],
      },
    );
  }
}
