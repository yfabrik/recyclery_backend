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
import {
  GIFT_CARD_STATUSES,
  type GiftCardStatus,
} from "../constants/dbEnums.js";
import type { ModelStatics } from "./db-types.ts";
import type GiftCardTransaction from "./giftcardtransaction.ts";
import type SalesTransaction from "./salestransaction.ts";
import type TransactionPayment from "./transactionpayment.ts";
import type User from "./user.ts";

export default class GiftCard extends Model<
  InferAttributes<GiftCard>,
  InferCreationAttributes<GiftCard>
> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare initial_value: number;
  declare expires_at: CreationOptional<Date | null>;
  declare status: CreationOptional<GiftCardStatus>;
  declare currency: CreationOptional<string>;
  declare issued_at: CreationOptional<Date>;
  declare note: CreationOptional<string | null>;
  declare recipient_name: CreationOptional<string | null>;
  declare recipient_email: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare current_value: NonAttribute<number | null>;

  declare issued_transaction_id: ForeignKey<SalesTransaction["id"] | null>;
  declare issued_refund_transaction_id: ForeignKey<
    SalesTransaction["id"] | null
  >;
  declare created_by: ForeignKey<User["id"] | null>;

  declare issuedTransaction?: NonAttribute<SalesTransaction | null>;
  declare issuedRefundTransaction?: NonAttribute<SalesTransaction | null>;
  declare createdBy?: NonAttribute<User | null>;
  declare transactions?: NonAttribute<
    Array<SalesTransaction & { GiftCardTransaction: GiftCardTransaction }>
  >;
  declare movements?: NonAttribute<GiftCardTransaction[]>;
  declare paymentUsages?: NonAttribute<TransactionPayment[]>;

  declare getIssuedTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setIssuedTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getIssuedRefundTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setIssuedRefundTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
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
  declare getMovements: HasManyGetAssociationsMixin<GiftCardTransaction>;
  //FIXME FAUX
  // declare addMovement: HasManyAddAssociationMixin<
  //   SalesTransaction,
  //   SalesTransaction["id"]
  // >;
  declare getPaymentUsages: HasManyGetAssociationsMixin<TransactionPayment>;
  declare addPaymentUsage: HasManyAddAssociationMixin<
    TransactionPayment,
    TransactionPayment["id"]
  >;

  static associate(models: ModelStatics) {
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
    this.hasMany(models.GiftCardTransaction, {
      foreignKey: "gift_card_id",
      as: "movements",
    });
    this.hasMany(models.TransactionPayment, {
      foreignKey: "gift_card_id",
      as: "paymentUsages",
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
        //@ts-expect-error  sequelize virtual marqued as nonattribute
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
          type: DataTypes.ENUM(...GIFT_CARD_STATUSES),
          allowNull: false,
          defaultValue: "active",
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: "EUR",
        },
        issued_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
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
            if (
              this.issued_transaction_id != null &&
              this.issued_refund_transaction_id != null
            ) {
              throw new Error(
                "A gift card can only have one issuance origin transaction",
              );
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
