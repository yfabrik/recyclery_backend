import {
  DataTypes,
  Model,
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
import type { Models, ModelStatics } from "./db-types.ts";
import type GiftCard from "./giftcard.ts";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";

export default class GiftCardTransaction extends Model<
  InferAttributes<GiftCardTransaction>,
  InferCreationAttributes<GiftCardTransaction>
> {
  declare id: CreationOptional<number>;
  declare type: "issue" | "charge" | "refund_recredit" | "manual_adjustment" | "expire";
  declare amount: string;
  declare occurred_at: Date;
  declare metadata: Record<string, unknown> | null;
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
  declare setSalesTransaction: BelongsToSetAssociationMixin<SalesTransaction, SalesTransaction["id"]>;
  declare getCreatedBy: BelongsToGetAssociationMixin<User>;
  declare setCreatedBy: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
    this.belongsTo(models.SalesTransaction, { foreignKey: "sales_transaction_id" });
    this.belongsTo(models.User, { as: "createdBy", foreignKey: "created_by" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        // gift_card_id: { type: DataTypes.INTEGER, allowNull: false },
        // sales_transaction_id: { type: DataTypes.INTEGER, allowNull: false },
        type: {
          type: DataTypes.ENUM("issue", "charge", "refund_recredit", "manual_adjustment", "expire"),
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
        occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        // created_by: { type: DataTypes.INTEGER, allowNull: true },
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
            const GiftCardModel = movement.sequelize.models.GiftCard as ModelStatic<GiftCard>;
            if (!GiftCardModel) throw new Error("GiftCard model not found");
            const giftCard = await GiftCardModel.findByPk(movement.gift_card_id, {
              transaction: options.transaction ?? null,
              include: [{ model: GiftCardTransaction, as: "movements" }],
            });
            if (!giftCard) throw new Error("Gift card not found");
            let newStatus = giftCard.status;
            const amount = Math.abs(Number(movement.amount));
            const currentValue = giftCard.current_value ?? 0;
            if (movement.type === "charge") {
              console.log(amount, currentValue);
              if (amount - currentValue < 0) {
                newStatus = "partially_used";
              }
              if (amount - currentValue >= 0) {
                newStatus = "redeemed";
              }
              await giftCard.update(
                { status: newStatus },
                { transaction: options.transaction ?? null },
              );
            }
          },
        },
      },
    );
  }
}
