import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyCountAssociationsMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.js";
import type Recyclery from "./recyclery.js";
import type CashSession from "./cashsession.js";

export default class CashRegister extends Model<InferAttributes<CashRegister>, InferCreationAttributes<CashRegister>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare is_active: boolean;
  declare recyclery_id: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Recyclery?: NonAttribute<Recyclery>;
  declare sessions?: NonAttribute<CashSession[]>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, number | null>;

  declare getSessions: HasManyGetAssociationsMixin<CashSession>;
  declare createSession: HasManyCreateAssociationMixin<CashSession, "cash_register_id">;
  declare countSessions: HasManyCountAssociationsMixin;

  static associate(models: Models) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.hasMany(models.CashSession, {
      foreignKey: "cash_register_id",
      as: "sessions",
      onDelete: "CASCADE",
    });
  }

  static initModel(sequelize: Sequelize) {
    CashRegister.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        recyclery_id: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "CashRegister",
        indexes: [
          { fields: ["recyclery_id"] },
          { fields: ["recyclery_id", "name"], unique: true },
        ],
        hooks: {
          beforeDestroy: async (caisse) => {
            const sessions = await caisse.countSessions({
              where: { status: "open" },
            });
            if (sessions > 0)
              throw new createHttpError.Conflict(
                "Impossible de supprimer une caisse avec des sessions ouvertes",
              );
          },
        },
      },
    );
  }
}
