import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyCreateAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type CashSession from "./cashsession.ts";
import type { ModelStatics } from "./db-types.ts";
import type GiftCard from "./giftcard.ts";
import type GiftCardTransaction from "./giftcardtransaction.ts";
import type LabeledItem from "./labeleditem.ts";
import type TransactionPayment from "./transactionpayment.ts";
import type User from "./user.ts";
import type TransactionItem from "./transactionitem.js";
import type TransactionGlobalPromotion from "./transactionGlobalPromotion.js";
import {
  SALES_PAYMENT_METHODS,
  SALES_TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type SalesPaymentMethod,
  type SalesTransactionStatus,
  type TransactionType,
} from "../constants/dbEnums.js";

export default class SalesTransaction extends Model<
  InferAttributes<SalesTransaction>,
  InferCreationAttributes<SalesTransaction>
> {
  declare id: CreationOptional<number>;
  declare total_amount_before_promotion: number;
  declare total_amount: number;
  declare payment_method: SalesPaymentMethod;
  declare transactionType: TransactionType;
  declare payment_amount: number;
  declare customer_name: CreationOptional<string | null>;
  declare customer_email: CreationOptional<string | null>;
  declare customer_postal_code: CreationOptional<string | null>;
  declare status: CreationOptional<SalesTransactionStatus>;

  // declare global_promotion: number | null;
  // declare global_promotion_type: "percent" | "fixed" | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare change_amount: NonAttribute<number>;

  declare cash_session_id: ForeignKey<CashSession["id"]>;
  declare created_by: ForeignKey<User["id"]>;
  declare transactionId: ForeignKey<SalesTransaction["id"]>;

  declare User?: NonAttribute<User>;
  declare CashSession?: NonAttribute<CashSession>;
  declare items?: Array<
    LabeledItem & { TransactionItem?: NonAttribute<TransactionItem> }
  >;
  declare refunds?: NonAttribute<SalesTransaction[]>;
  declare giftCards?: NonAttribute<
    Array<GiftCard & { GiftCardTransaction: NonAttribute<GiftCardTransaction> }>
  >;
  declare giftCardMovements?: NonAttribute<GiftCardTransaction[]>;
  declare payments?: NonAttribute<TransactionPayment[]>;
  declare issuedGiftCards?: NonAttribute<GiftCard[]>;
  declare refundIssuedGiftCards?: NonAttribute<GiftCard[]>;
  declare globalPromotions?: NonAttribute<TransactionGlobalPromotion[]>;

  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, User["id"]>;
  declare getCashSession: BelongsToGetAssociationMixin<CashSession>;
  declare setCashSession: BelongsToSetAssociationMixin<
    CashSession,
    CashSession["id"]
  >;
  declare getItems: BelongsToManyGetAssociationsMixin<LabeledItem>;
  declare setItems: BelongsToManySetAssociationsMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare addItem: BelongsToManyAddAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare addItems: BelongsToManyAddAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare createItem: BelongsToManyCreateAssociationMixin<LabeledItem>;
  declare getRefunds: HasManyGetAssociationsMixin<SalesTransaction>;
  declare addRefund: HasManyAddAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getGiftCards: BelongsToManyGetAssociationsMixin<GiftCard>;
  declare setGiftCards: BelongsToManySetAssociationsMixin<
    GiftCard,
    GiftCard["id"]
  >;
  declare addGiftCard: BelongsToManyAddAssociationMixin<
    GiftCard,
    GiftCard["id"]
  >;
  declare getGiftCardMovements: HasManyGetAssociationsMixin<GiftCardTransaction>;
  //FIXME FAUX
  // declare addGiftCardMovement: HasManyAddAssociationMixin<
  //   GiftCard,
  //   GiftCard["id"]
  // >;
  declare getPayments: HasManyGetAssociationsMixin<TransactionPayment>;
  declare addPayment: HasManyAddAssociationMixin<
    TransactionPayment,
    TransactionPayment["id"]
  >;
  declare createPayment: HasManyCreateAssociationMixin<
    TransactionPayment, "sales_transaction_id"
  >;
  declare removePayment: HasManyRemoveAssociationMixin<
    TransactionPayment, TransactionPayment["id"]
  >;
  declare getIssuedGiftCards: HasManyGetAssociationsMixin<GiftCard>;
  declare addIssuedGiftCard: HasManyAddAssociationMixin<
    GiftCard,
    GiftCard["id"]
  >;
  declare getRefundIssuedGiftCards: HasManyGetAssociationsMixin<GiftCard>;
  declare addRefundIssuedGiftCard: HasManyAddAssociationMixin<
    GiftCard,
    GiftCard["id"]
  >;
  declare createGlobalPromotion: HasManyCreateAssociationMixin<TransactionGlobalPromotion>;

  static associate(models: ModelStatics) {
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
      onDelete: "CASCADE"
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
    this.hasMany(models.TransactionGlobalPromotion, {
      as: "globalPromotions",
      foreignKey: "transaction_id",
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
        transactionId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
        },
        total_amount_before_promotion: {
          type: DataTypes.DECIMAL(10, 2), //argent total des items dans la transaction
          allowNull: false,
        },
        payment_method: {
          type: DataTypes.ENUM(...SALES_PAYMENT_METHODS),
          allowNull: false,
        },
        transactionType: {
          type: DataTypes.ENUM(...TRANSACTION_TYPES),
          defaultValue: "sell",
          allowNull: false,
        },
        payment_amount: {
          type: DataTypes.DECIMAL(10, 2), //argent donné par le client
          allowNull: false,
        },
        //@ts-expect-error  sequelize virtual marqued as nonattribute
        change_amount: {
          type: DataTypes.VIRTUAL,
          get(this: SalesTransaction) {
            return (
              Number(this.payment_amount ?? 0) - Number(this.total_amount ?? 0)
            );
          },
        },
        global_promotion: {
          type: DataTypes.VIRTUAL,
          get(this: SalesTransaction) {
            if (!this.globalPromotions) return null;
            return this.globalPromotions[0]?.value ?? null;
          },
        },
        global_promotion_type: {
          type: DataTypes.VIRTUAL,
          get(this: SalesTransaction) {
            if (!this.globalPromotions) return null;
            return this.globalPromotions[0]?.type ?? null;
          },
        },
        total_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        customer_name: DataTypes.STRING,
        customer_email: DataTypes.STRING,
        customer_postal_code: DataTypes.STRING,
        status: {
          type: DataTypes.ENUM(...SALES_TRANSACTION_STATUSES),
          defaultValue: "completed",
          allowNull: false,
        },

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
