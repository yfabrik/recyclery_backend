import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type HasManyCountAssociationsMixin,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
  type InferAttributes,
  type ForeignKey,
} from "sequelize";
import type { Models, ModelStatics } from "./db-types.ts";
import type CashSession from "./cashsession.ts";
import type Recyclery from "./recyclery.ts";

export default class CashRegister extends Model<
  InferAttributes<CashRegister>,
  InferCreationAttributes<CashRegister>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare is_active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare recyclery_id: ForeignKey<Recyclery["id"]>

  declare Recyclery?: NonAttribute<Recyclery>;
  declare sessions?: NonAttribute<CashSession[]>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, Recyclery['id']>;
  declare getSessions: HasManyGetAssociationsMixin<CashSession>;
  declare addSession: HasManyAddAssociationMixin<CashSession, CashSession["id"]>;
  declare countSessions: HasManyCountAssociationsMixin;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.hasMany(models.CashSession, {
      foreignKey: "cash_register_id",
      as: "sessions",
      onDelete: "CASCADE",
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
        name: { type: DataTypes.STRING, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
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
            if (sessions) {
              throw new createHttpError[424]("Impossible de supprimer une caisse avec des sessions ouvertes");
            }
          },
        },
      },
    );
  }
}
