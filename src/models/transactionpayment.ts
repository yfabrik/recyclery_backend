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
import type { Models, ModelStatics } from "./db-types.ts";
import type GiftCard from "./giftcard.ts";
import type SalesTransaction from "./salestransaction.ts";

export default class TransactionPayment extends Model<
  InferAttributes<TransactionPayment>,
  InferCreationAttributes<TransactionPayment>
> {
  declare id: CreationOptional<number>;
  declare method: "cash" | "card" | "check" | "giftcard";
  declare amount: number;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare sales_transaction_id: ForeignKey<SalesTransaction["id"]>;
  declare gift_card_id: ForeignKey<GiftCard["id"] | null>;


  declare SalesTransaction?: NonAttribute<SalesTransaction>;
  declare GiftCard?: NonAttribute<GiftCard | null>;

  declare getSalesTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setSalesTransaction: BelongsToSetAssociationMixin<SalesTransaction, SalesTransaction["id"]>;
  declare getGiftCard: BelongsToGetAssociationMixin<GiftCard>;
  declare setGiftCard: BelongsToSetAssociationMixin<GiftCard, GiftCard["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.SalesTransaction, { foreignKey: "sales_transaction_id" });
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
        // sales_transaction_id: { type: DataTypes.INTEGER, allowNull: false },
        method: {
          type: DataTypes.ENUM("cash", "card", "check", "giftcard"),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: { min: 0.01 },
        },
        // gift_card_id: { type: DataTypes.INTEGER, allowNull: true },
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
