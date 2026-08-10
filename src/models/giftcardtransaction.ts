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
import {
  GIFT_CARD_TRANSACTION_TYPES,
  type GiftCardTransactionType,
} from "../constants/dbEnums.js";
import {
  getGiftCardBalanceInTx,
  syncGiftCardStatus,
  toAmount,
} from "../services/giftCardLedger.js";
import { withTransaction } from "../utils/transaction.js";
import type { ModelStatics } from "./db-types.ts";
import GiftCard from "./giftcard.js";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";
import createHttpError from "http-errors";

export default class GiftCardTransaction extends Model<
  InferAttributes<GiftCardTransaction>,
  InferCreationAttributes<GiftCardTransaction>
> {
  declare type: GiftCardTransactionType;
  declare amount: number;
  declare occurred_at: CreationOptional<Date>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare created_by: ForeignKey<User["id"] | null>;
  declare gift_card_id: ForeignKey<GiftCard["id"]>;
  declare sales_transaction_id: ForeignKey<SalesTransaction["id"]>;

  declare GiftCard?: NonAttribute<GiftCard>;
  declare SalesTransaction?: NonAttribute<SalesTransaction>;
  declare createdBy?: NonAttribute<User>;

  declare getGiftCard: BelongsToGetAssociationMixin<GiftCard>;
  declare setGiftCard: BelongsToSetAssociationMixin<GiftCard, GiftCard["id"]>;
  declare getSalesTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setSalesTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getCreatedBy: BelongsToGetAssociationMixin<User>;
  declare setCreatedBy: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
    this.belongsTo(models.SalesTransaction, {
      foreignKey:"sales_transaction_id",
    });
    this.belongsTo(models.User, {
      as: "createdBy",
      foreignKey: { name: "created_by", allowNull: true },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        gift_card_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        sales_transaction_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        type: {
          type: DataTypes.ENUM(...GIFT_CARD_TRANSACTION_TYPES),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            notZero(value: string | number) {
              if (Number(value) === 0) {
                throw new Error("amount must be non-zero");
              }
            },
          },
        },
        occurred_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        metadata: { type: DataTypes.JSON, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "GiftCardTransaction",
        tableName: "giftcard_transactions",
        indexes: [
          { fields: ["gift_card_id", "occurred_at"] },
          { fields: ["sales_transaction_id"] },
        ],
        hooks: {
          afterCreate: async (instance, options) => {
            await withTransaction(
              instance.sequelize!,
              options.transaction,
              (tx) => syncGiftCardStatus(instance.gift_card_id, tx),
            );
          },
          beforeDestroy: async (instance, options) => {
            if (instance.type === "issue") {
              throw new createHttpError.BadRequest(
                "cannot delete issue transaction, delete the gift card instead",
              );
            }
            await withTransaction(
              instance.sequelize!,
              options.transaction,
              async (tx) => {
                const { currentBalance } = await getGiftCardBalanceInTx(
                  instance.gift_card_id,
                  tx,
                );
                if (currentBalance - toAmount(instance.amount) < 0) {
                  throw new createHttpError[424](
                    "Impossible de supprimer: le solde de la carte cadeau deviendrait négatif",
                  );
                }
              },
            );
          },
          afterDestroy: async (instance, options) => {
            await withTransaction(
              instance.sequelize!,
              options.transaction,
              (tx) => syncGiftCardStatus(instance.gift_card_id, tx),
            );
          },
        },
      },
    );
  }
}
