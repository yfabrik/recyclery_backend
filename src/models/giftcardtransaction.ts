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
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import {
  GIFT_CARD_TRANSACTION_TYPES,
  type GiftCardStatus,
  type GiftCardTransactionType,
} from "../constants/dbEnums.js";
// import { getGiftCardBalance } from "../services/giftCards.js";
import type { ModelStatics } from "./db-types.ts";
import GiftCard from "./giftcard.js";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";
import { findByPkOrThrow } from "../services/sequelize.js";

//FIXME import giftcard service crash the app (loop import fail ?)
const toAmount = (value?: number | string | null) =>
  Number.parseFloat(String(value ?? 0));

const getGiftCardBalanceInTx = async (
  giftCardId: InstanceType<typeof GiftCard>["id"],
  transaction: Transaction | null,
) => {
  const giftCard = await findByPkOrThrow(
    GiftCard,
    giftCardId,
    "gift card not found",
    { transaction },
  );

  const GiftCardTransactionModel = giftCard.sequelize.models.GiftCard as
    | ModelStatic<GiftCardTransaction>
    | undefined;
  if (!GiftCardTransactionModel) throw new Error("fuck you");
  const movementSum =
    (await GiftCardTransactionModel.sum("amount", {
      where: { gift_card_id: giftCardId },
      transaction,
    })) || 0;

  return {
    giftCard,
    initialValue: toAmount(giftCard.initial_value),
    movementSum: toAmount(movementSum),
    currentBalance: toAmount(giftCard.initial_value) + toAmount(movementSum),
  };
};

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

  declare created_by: ForeignKey<User["id"]>;
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
      foreignKey: "sales_transaction_id",
    });
    this.belongsTo(models.User, { as: "createdBy", foreignKey: "created_by" });
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
          beforeCreate: async (movement, options) => {
            const GiftCardModel = movement.sequelize.models.GiftCard as
              | ModelStatic<GiftCard>
              | undefined;
            if (!GiftCardModel) throw new Error("GiftCard model not found");
            await GiftCardModel.findByPk(movement.gift_card_id, {
              transaction: options.transaction ?? null,
              include: [{ model: GiftCardTransaction, as: "movements" }],
            });
            // if (!giftCard) throw new Error("Gift card not found");
            // let newStatus = giftCard.status;
            // const amount = Math.abs(Number(movement.amount));
            // const currentValue = giftCard.current_value ?? 0;
            // if (movement.type === "charge") {
            //   if (amount - currentValue < 0) {
            //     newStatus = "partially_used";
            //   }
            //   if (amount - currentValue >= 0) {
            //     newStatus = "redeemed";
            //   }
            //   await giftCard.update(
            //     { status: newStatus },
            //     { transaction: options.transaction ?? null },
            //   );
            // }
          },

          //TODO MERGE BOTH create and destroy
          afterCreate: async (instance, options) => {
            console.log("gift transac create", instance);
            const giftCard = await instance.getGiftCard();
            const transacs = await giftCard.getMovements();
            console.log("tamerelapute",transacs)
            const movementSum = transacs.reduce(
              (prev, current) => prev + current.amount,
              0,
            );
            const initialValue = giftCard.initial_value;
            // const { giftCard, currentBalance, initialValue, movementSum } =
            //   await getGiftCardBalanceInTx(
            //     instance.gift_card_id,
            //     options.transaction ?? null,
            //   );
            console.log(giftCard, initialValue, movementSum);
            // pas la peine d'update le status si expired
            let newStatus = giftCard.status as GiftCardStatus;
            console.log("new", newStatus);
            if (giftCard.expires_at && giftCard.expires_at < new Date())
              newStatus = "expired";
            if (movementSum > 0 && movementSum < initialValue)
              newStatus = "partially_used";
            if (movementSum <= 0) newStatus = "redeemed";

            console.log("new,new", newStatus);

            await giftCard.update(
              { status: newStatus },
              { transaction: options.transaction ?? null },
            );
          },
          afterDestroy: async (instance, options) => {
            console.log("gift transac destroy");
            const { giftCard, initialValue, movementSum } =
              await getGiftCardBalanceInTx(
                instance.gift_card_id,
                options.transaction ?? null,
              );
            // pas la peine d'update le status si expired
            let newStatus = giftCard.status as GiftCardStatus;
            console.log("new", newStatus);

            if (giftCard.expires_at && giftCard.expires_at < new Date())
              newStatus = "expired";
            if (movementSum > 0 && movementSum < initialValue)
              newStatus = "partially_used";
            if (movementSum > 0 && movementSum >= initialValue)
              newStatus = "redeemed";
            console.log("new,new", newStatus);

            await giftCard.update(
              { status: newStatus },
              { transaction: options.transaction ?? null },
            );
          },
        },
      },
    );
  }
}
