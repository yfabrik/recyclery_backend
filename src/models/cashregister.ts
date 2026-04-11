import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  Op,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyCountAssociationsMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type CashSession from "./cashsession.ts";
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import logger from "../services/logger.js";

export default class CashRegister extends Model<
  InferAttributes<CashRegister>,
  InferCreationAttributes<CashRegister>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare is_active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare recyclery_id: ForeignKey<Recyclery["id"]>;

  declare Recyclery?: NonAttribute<Recyclery>;
  declare sessions?: NonAttribute<CashSession[]>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getSessions: HasManyGetAssociationsMixin<CashSession>;
  declare addSession: HasManyAddAssociationMixin<
    CashSession,
    CashSession["id"]
  >;
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
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
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
          //TODO constraint sur name + recyclery ID =>unique possible ????

          // Vérifier qu'une autre caisse avec ce nom n'existe pas dans le même magasin
          beforeUpdate: async (caisse, options) => {
            const Registrer = caisse.sequelize.models.CashRegister as ModelStatic<CashRegister> | undefined
            if (!Registrer) {
              logger.error(`Task model not found for schedule ${caisse.id}`);
              return;
            }

            const duplicateRegister = await Registrer.findOne({
              where: {
                [Op.and]: [
                  { name: caisse.name },
                  { recyclery_id: caisse.recyclery_id },
                  { id: { [Op.ne]: caisse.id } }, // Exclude current record
                ],
              },
            });

            if (duplicateRegister) {
              throw new createHttpError.Conflict(
                "Une autre caisse avec ce nom existe déjà dans ce magasin",
              );
            }
          },
          beforeDestroy: async (caisse) => {
            const sessions = await caisse.countSessions({
              where: { status: "open" },
            });
            if (sessions) {
              throw new createHttpError[424](
                "Impossible de supprimer une caisse avec des sessions ouvertes",
              );
            }
          },
        },
      },
    );
  }
}
