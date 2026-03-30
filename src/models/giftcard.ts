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
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type GiftCardTransaction from "./giftcardtransaction.ts";
import type SalesTransaction from "./salestransaction.ts";
import type TransactionPayment from "./transactionpayment.ts";
import type User from "./user.ts";

export default class GiftCard extends Model<InferAttributes<GiftCard>, InferCreationAttributes<GiftCard>> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare initial_value: string;
  declare current_value: number | null;
  declare expires_at: Date | null;
  declare status: "active" | "partially_used" | "redeemed" | "expired" | "cancelled";
  declare currency: string;
  declare issued_at: Date;
  declare issued_transaction_id: ForeignKey<number | null>;
  declare issued_refund_transaction_id: ForeignKey<number | null>;
  declare created_by: ForeignKey<number | null>;
  declare note: string | null;
  declare recipient_name: string | null;
  declare recipient_email: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare issuedTransaction?: NonAttribute<SalesTransaction | null>;
  declare issuedRefundTransaction?: NonAttribute<SalesTransaction | null>;
  declare createdBy?: NonAttribute<User | null>;
  declare transactions?: NonAttribute<SalesTransaction[]>;
  declare movements?: NonAttribute<GiftCardTransaction[]>;
  declare paymentUsages?: NonAttribute<TransactionPayment[]>;

  declare getIssuedTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setIssuedTransaction: BelongsToSetAssociationMixin<SalesTransaction, number>;
  declare getIssuedRefundTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setIssuedRefundTransaction: BelongsToSetAssociationMixin<SalesTransaction, number>;
  declare getCreatedBy: BelongsToGetAssociationMixin<User>;
  declare setCreatedBy: BelongsToSetAssociationMixin<User, number>;
  declare getTransactions: BelongsToManyGetAssociationsMixin<SalesTransaction>;
  declare setTransactions: BelongsToManySetAssociationsMixin<SalesTransaction, number>;
  declare addTransaction: BelongsToManyAddAssociationMixin<SalesTransaction, number>;
  declare getMovements: HasManyGetAssociationsMixin<GiftCardTransaction>;
  declare addMovement: HasManyAddAssociationMixin<GiftCardTransaction, number>;
  declare getPaymentUsages: HasManyGetAssociationsMixin<TransactionPayment>;
  declare addPaymentUsage: HasManyAddAssociationMixin<TransactionPayment, number>;

  static associate(models: Models) {
    this.belongsTo(models.SalesTransaction, {
      as: "issuedTransaction",
      foreignKey: "issued_transaction_id",
    });
    this.belongsTo(models.SalesTransaction, {
      as: "issuedRefundTransaction",
      foreignKey: "issued_refund_transaction_id",
    });
    this.belongsTo(models.User, { as: "createdBy", foreignKey: "created_by" });
    this.belongsToMany(models.SalesTransaction, {
      through: models.GiftCardTransaction,
      foreignKey: "gift_card_id",
      otherKey: "sales_transaction_id",
      as: "transactions",
    });
    this.hasMany(models.GiftCardTransaction, { foreignKey: "gift_card_id", as: "movements" });
    this.hasMany(models.TransactionPayment, { foreignKey: "gift_card_id", as: "paymentUsages" });
  }

  static initModel(sequelize: Sequelize) {
    GiftCard.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        code: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          defaultValue: () => `GC-${Date.now().toString(36).toUpperCase()}`,
        },
        initial_value: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0 },
        },
        current_value: {
          type: DataTypes.VIRTUAL,
          get(this: GiftCard) {
            const fromMovements = this.movements?.reduce(
              (prev, current) => prev + Number(current.amount),
              0,
            );
            return fromMovements ?? Number(this.initial_value ?? 0);
          },
        },
        expires_at: { type: DataTypes.DATE, allowNull: true },
        status: {
          type: DataTypes.ENUM("active", "partially_used", "redeemed", "expired", "cancelled"),
          allowNull: false,
          defaultValue: "active",
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: "EUR",
        },
        issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        issued_transaction_id: { type: DataTypes.INTEGER, allowNull: true },
        issued_refund_transaction_id: { type: DataTypes.INTEGER, allowNull: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        note: { type: DataTypes.TEXT, allowNull: true },
        recipient_name: { type: DataTypes.STRING, allowNull: true },
        recipient_email: { type: DataTypes.STRING, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "GiftCard",
        validate: {
          singleIssuanceOrigin() {
            const self = this as unknown as GiftCard;
            if (
              self.issued_transaction_id != null &&
              self.issued_refund_transaction_id != null
            ) {
              throw new Error("A gift card can only have one issuance origin transaction");
            }
          },
        },
        hooks: {},
        indexes: [
          { unique: true, fields: ["code"] },
          { fields: ["status"] },
          { fields: ["expires_at"] },
        ],
      },
    );
  }
}
