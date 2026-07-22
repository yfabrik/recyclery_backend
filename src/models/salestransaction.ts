import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  Op,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyCreateAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type DestroyOptions,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
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
import { withTransaction } from "../utils/transaction.js";

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
  declare created_by: ForeignKey<User["id"] | null>;
  declare transactionId: ForeignKey<SalesTransaction["id"] | null>;

  declare User?: NonAttribute<User>;
  declare CashSession?: NonAttribute<CashSession>;
  declare items?: Array<
    LabeledItem & { TransactionItem?: NonAttribute<TransactionItem> }
  >;
  declare originalTransaction?: NonAttribute<SalesTransaction | null>;
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
  declare getOriginalTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setOriginalTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
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
    this.belongsTo(models.User, {
      foreignKey: { name: "created_by", allowNull: true },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.CashSession, {
      foreignKey: { name: "cash_session_id", allowNull: false },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.LabeledItem, {
      through: models.TransactionItem,
      foreignKey: "transaction_id",
      otherKey: "labeled_item_id",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    //the origin of the refund
    this.belongsTo(models.SalesTransaction, {
      foreignKey: { name: "transactionId", allowNull: true },
      as: "originalTransaction",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.SalesTransaction, {
      foreignKey: "transactionId",
      as: "refunds",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.GiftCard, {
      through: models.GiftCardTransaction,
      foreignKey: "sales_transaction_id",
      otherKey: "gift_card_id",
      as: "giftCards",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.GiftCardTransaction, {
      foreignKey: "sales_transaction_id",
      as: "giftCardMovements",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.TransactionPayment, {
      foreignKey: "sales_transaction_id",
      as: "payments",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.GiftCard, {
      as: "issuedGiftCards",
      foreignKey: "issued_transaction_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.GiftCard, {
      as: "refundIssuedGiftCards",
      foreignKey: "issued_refund_transaction_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.TransactionGlobalPromotion, {
      as: "globalPromotions",
      foreignKey: "transaction_id",
      onDelete: "CASCADE",
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
        hooks: {
          beforeDestroy: async (sale, options) => {
            await withTransaction(
              sale.sequelize!,
              options.transaction,
              async (t) => {
                const GiftCardModel = sale.sequelize.models
                  .GiftCard as ModelStatic<GiftCard>;
                const GiftCardTransactionModel = sale.sequelize.models
                  .GiftCardTransaction as ModelStatic<GiftCardTransaction>;
                const TransactionPaymentModel = sale.sequelize.models
                  .TransactionPayment as ModelStatic<TransactionPayment>;
                const issued = await GiftCardModel.findAll({
                  where: {
                    [Op.or]: [
                      { issued_transaction_id: sale.id },
                      { issued_refund_transaction_id: sale.id },
                    ],
                  },
                  transaction: t,
                });
                for (const card of issued) {
                  const nonIssue = await GiftCardTransactionModel.count({
                    where: {
                      gift_card_id: card.id,
                      type: { [Op.ne]: "issue" },
                    },
                    transaction: t,
                  });
                  const payments = await TransactionPaymentModel.count({
                    where: { gift_card_id: card.id },
                    transaction: t,
                  });
                  if (nonIssue > 0 || payments > 0) {
                    throw new createHttpError[424](
                      "Impossible de supprimer la vente: une carte cadeau émise a déjà été utilisée",
                    );
                  }
                }
                for (const card of issued) {
                  await GiftCardTransactionModel.destroy({
                    where: { gift_card_id: card.id },
                    transaction: t,
                  });
                  await card.destroy({
                    transaction: t,
                    cascadeFromSale: true,
                  } as DestroyOptions & { cascadeFromSale?: boolean });
                }
              },
            );
          },
        },
      },
    );
  }
}
