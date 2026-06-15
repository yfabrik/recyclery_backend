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
import type { ModelStatics } from "./db-types.ts";
import type SalesTransaction from "./salestransaction.ts";
import { PROMOTION_TYPES, type PromotionType } from "../constants/dbEnums.js";

export default class TransactionGlobalPromotion extends Model<
  InferAttributes<TransactionGlobalPromotion>,
  InferCreationAttributes<TransactionGlobalPromotion>
> {
  declare id: CreationOptional<number>;

  declare value: number;
  declare type: PromotionType;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare transaction_id: ForeignKey<SalesTransaction["id"]>;

  declare SalesTransaction?: NonAttribute<SalesTransaction | null>;

  declare getSalesTransaction: BelongsToGetAssociationMixin<SalesTransaction>;
  declare setSalesTransaction: BelongsToSetAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;

  static associate(models: ModelStatics) {
    this.belongsTo(models.SalesTransaction, { foreignKey: "transaction_id" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        value: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        type: {
          type: DataTypes.ENUM(...PROMOTION_TYPES),
          allowNull: false,
          defaultValue: "percent",
        },
        transaction_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        validate: {
          valueBasedOnType() {
            if (this.type === "percent") {
              if (Number(this.value) < 0 || Number(this.value) > 100) {
                throw new Error("Value must be between 0 and 100");
              }
            }
            if (this.type === "fixed") {
              if (Number(this.value) < 0) {
                throw new Error("Value must be greater than 0");
              }
            }
          },
        },
        modelName: "TransactionGlobalPromotion",
      },
    );
  }
}
