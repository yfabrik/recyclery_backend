import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  Transaction,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import { PAYMENT_METHODS, type PaymentMethod } from "../constants/dbEnums.js";
import type { ModelStatics } from "./db-types.ts";
import type GiftCard from "./giftcard.ts";
import type SalesTransaction from "./salestransaction.ts";

export default class TransactionPayment extends Model<
  InferAttributes<TransactionPayment>,
  InferCreationAttributes<TransactionPayment>
> {
  declare id: CreationOptional<number>;
  declare method: PaymentMethod;
  declare amount: number;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare sales_transaction_id: ForeignKey<SalesTransaction["id"]>;
  declare gift_card_id: ForeignKey<GiftCard["id"] | null>;

  declare SalesTransaction?: NonAttribute<SalesTransaction>;
  declare GiftCard?: NonAttribute<GiftCard | null>;

  declare getSalesTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setSalesTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getGiftCard: BelongsToGetAssociationMixin<GiftCard>;
  declare setGiftCard: BelongsToSetAssociationMixin<GiftCard, GiftCard["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.SalesTransaction, {
      foreignKey: "sales_transaction_id",
    });
    this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        method: {
          type: DataTypes.ENUM(...PAYMENT_METHODS),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: { min: 0.01 },
        },
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
        hooks: {
          beforeCreate: async (instance, options) => {
            const transaction = options.transaction ?? null
            console.log("in payment hook before create")
            const gift = await instance.getGiftCard({ transaction })
            if (!gift) return
            const sale = await instance.getSalesTransaction({ transaction })
            if (!sale)
              throw new createHttpError.InternalServerError("no sale transaction associé")//TODO 500 ok ?
            const run = async (t: Transaction) => {
              //charge giftcard ?
              // await chargeGiftCard({
              //   giftCardId: instance.gift_card_id!,
              //   salesTransactionId: instance.sales_transaction_id,
              //   amount: instance.amount,
              //   createdBy: sale.created_by,
              //   metadata: { source: "sale_payment" },
              //   transaction: t
              // });
            }
            if (transaction) return run(transaction);
            return sequelize.transaction(run);

          },

          afterDestroy: async (instance, option) => {
            //TRIGGERED when editing payemnts
            //remove giftcard transaction if there is one
            const t = option.transaction ?? null;
            const gift = await instance.getGiftCard({ transaction: t });
            if (!gift) return;
            const transaction = await instance.getSalesTransaction({
              transaction: t,
            });
            const cardPayments = await transaction.getGiftCardMovements({
              where: { gift_card_id: instance.gift_card_id },
              transaction: t,
            });
            if (cardPayments[0]) await cardPayments[0].destroy({ transaction: t });
          },
        },
      },
    );
  }
}
