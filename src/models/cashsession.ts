import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type CashRegister from "./cashregister.ts";
import type SalesTransaction from "./salestransaction.ts";
import type User from "./user.ts";

export default class CashSession extends Model<InferAttributes<CashSession>, InferCreationAttributes<CashSession>> {
  declare id: CreationOptional<number>;
  declare opening_amount: string;
  declare closing_amount: string | null;
  declare expected_amount: string | null;
  declare difference_amount: number;
  declare status: "open" | "close";
  declare notes: string | null;
  declare closed_at: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare CashRegister?: NonAttribute<CashRegister | null>;
  declare SalesTransactions?: NonAttribute<SalesTransaction[]>;
  declare User?: NonAttribute<User | null>;

  declare getCashRegister: BelongsToGetAssociationMixin<CashRegister>;
  declare setCashRegister: BelongsToSetAssociationMixin<CashRegister, number>;
  declare getSalesTransactions: HasManyGetAssociationsMixin<SalesTransaction>;
  declare addSalesTransaction: HasManyAddAssociationMixin<SalesTransaction, number>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, number>;

  static associate(models: Models) {
    this.belongsTo(models.CashRegister, { foreignKey: "cash_register_id" });
    this.hasMany(models.SalesTransaction, { foreignKey: "cash_session_id" });
    this.belongsTo(models.User, { foreignKey: "user_id" });
  }

  static initModel(sequelize: Sequelize) {
    CashSession.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        opening_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        closing_amount: DataTypes.DECIMAL(10, 2),
        expected_amount: DataTypes.DECIMAL(10, 2),
        difference_amount: {
          type: DataTypes.VIRTUAL,
          get(this: CashSession) {
            if (this.status === "open") return 0;
            const closing = Number(this.closing_amount) || 0;
            const expected = Number(this.expected_amount) || 0;
            return closing - expected;
          },
        },
        status: { type: DataTypes.ENUM("open", "close"), defaultValue: "open" },
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
