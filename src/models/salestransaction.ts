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

export default class SalesTransaction extends Model<
  InferAttributes<SalesTransaction>,
  InferCreationAttributes<SalesTransaction>
> {
  declare id: CreationOptional<number>;
  declare total_amount: string | null;
  declare payment_method: "cash" | "card" | "check" | "giftcard" | "mixed" | null;
  declare transactionType: "sell" | "refund";
  declare payment_amount: string | null;
  declare change_amount: number;
  declare customer_name: string | null;
  declare customer_email: string | null;
  declare customer_postal_code: string | null;
  declare status: "pending" | "completed" | "cancelled";
  declare cash_session_id: ForeignKey<number | null>;
  declare created_by: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.User, { foreignKey: "created_by" });
    this.belongsTo(models.CashSession, { foreignKey: "cash_session_id" });
    this.belongsToMany(models.LabeledItem, {
      through: models.TransactionItem,
      foreignKey: "transaction_id",
      otherKey: "labeled_item_id",
      as: "items",
    });
    this.hasMany(models.SalesTransaction, {
      foreignKey: "transactionId",
      as: "refunds",
    });
    this.belongsToMany(models.GiftCard, {
      through: models.GiftCardTransaction,
      foreignKey: "sales_transaction_id",
      otherKey: "gift_card_id",
      as: "giftCards",
    });
    this.hasMany(models.GiftCardTransaction, {
      foreignKey: "sales_transaction_id",
      as: "giftCardMovements",
    });
    this.hasMany(models.TransactionPayment, {
      foreignKey: "sales_transaction_id",
      as: "payments",
    });
    this.hasMany(models.GiftCard, {
      as: "issuedGiftCards",
      foreignKey: "issued_transaction_id",
    });
    this.hasMany(models.GiftCard, {
      as: "refundIssuedGiftCards",
      foreignKey: "issued_refund_transaction_id",
    });
  }

  static initModel(sequelize: Sequelize) {
    SalesTransaction.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        total_amount: DataTypes.DECIMAL(10, 2),
        payment_method: DataTypes.ENUM("cash", "card", "check", "giftcard", "mixed"),
        transactionType: {
          type: DataTypes.ENUM("sell", "refund"),
          defaultValue: "sell",
        },
        payment_amount: DataTypes.DECIMAL(10, 2),
        change_amount: {
          type: DataTypes.VIRTUAL,
          get(this: SalesTransaction) {
            return Number(this.payment_amount ?? 0) - Number(this.total_amount ?? 0);
          },
        },
        customer_name: DataTypes.STRING,
        customer_email: DataTypes.STRING,
        customer_postal_code: DataTypes.STRING,
        status: {
          type: DataTypes.ENUM("pending", "completed", "cancelled"),
          defaultValue: "completed",
        },
        cash_session_id: DataTypes.INTEGER,
        created_by: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "SalesTransaction",
        indexes: [
          { fields: ["cash_session_id"] },
          { fields: ["createdAt"] },
          { fields: ["status"] },
        ],
      },
    );
  }
}
