import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type CashRegister from "./cashregister.ts";
import type { ModelStatics } from "./db-types.ts";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";
import {
  CASH_SESSION_STATUSES,
  type CashSessionStatus,
} from "../constants/dbEnums.js";

export default class CashSession extends Model<
  InferAttributes<CashSession>,
  InferCreationAttributes<CashSession>
> {
  declare id: CreationOptional<number>;
  declare opening_amount: number;
  declare closing_amount: CreationOptional<number | null>;
  declare expected_amount: CreationOptional<number | null>;
  declare difference_amount: NonAttribute<number>;
  declare status: CreationOptional<CashSessionStatus>;
  declare notes: CreationOptional<string | null>;
  declare closed_at: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare cash_register_id: ForeignKey<CashRegister["id"]>;
  declare user_id: ForeignKey<User["id"]>;

  declare CashRegister?: NonAttribute<CashRegister >;
  declare SalesTransactions?: NonAttribute<SalesTransaction[]>;
  declare User?: NonAttribute<User >;

  declare getCashRegister: BelongsToGetAssociationMixin<CashRegister>;
  declare setCashRegister: BelongsToSetAssociationMixin<
    CashRegister,
    CashRegister["id"]
  >;
  declare getSalesTransactions: HasManyGetAssociationsMixin<SalesTransaction>;
  declare addSalesTransaction: HasManyAddAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare createSalesTransaction: HasManyCreateAssociationMixin<SalesTransaction>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.CashRegister, {
      foreignKey:{ name:"cash_register_id",allowNull: false},
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.SalesTransaction, {
      foreignKey: "cash_session_id",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.User, {
      foreignKey:{ name:"user_id",allowNull: false},
      onDelete: "RESTRICT",
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
        opening_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        closing_amount: DataTypes.DECIMAL(10, 2),
        expected_amount: DataTypes.DECIMAL(10, 2),
        // @ts-expect-error sequelize virtual marqued as nonattribute
        difference_amount: {
          type: DataTypes.VIRTUAL,
          get(this: CashSession) {
            if (this.status === "open") return 0;
            const closing = Number(this.closing_amount) || 0;
            const expected = Number(this.expected_amount) || 0;
            return closing - expected;
          },
        },
        status: {
          type: DataTypes.ENUM(...CASH_SESSION_STATUSES),
          defaultValue: "open",
          allowNull: false,
        },
        notes: DataTypes.TEXT,
        closed_at: DataTypes.DATE,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "CashSession",
        indexes: [
          { fields: ["cash_register_id"] },
          { fields: ["user_id", "status"] },
          { fields: ["status"] },
          { fields: ["createdAt"] },
        ],
      },
    );
  }
}
