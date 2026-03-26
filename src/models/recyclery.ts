import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.js";

export default class Recyclery extends Model<InferAttributes<Recyclery>, InferCreationAttributes<Recyclery>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare address: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare city: string | null;
  declare postal_code: string | null;
  declare is_active: boolean;
  declare manager_id: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare TaskSchedules?: Array<{ update: (v: { is_recurring: boolean; name: string }) => Promise<void> }>;

  static associate(models: Models) {
    this.hasMany(models.LabeledItem, { foreignKey: "recyclery_id" });
    this.hasMany(models.Donation, { foreignKey: "recyclery_id" });
    this.hasMany(models.Task, {
      onDelete: "CASCADE",
      foreignKey: "store_id",
    });
    this.hasMany(models.TaskSchedule, {
      onDelete: "CASCADE",
      foreignKey: "store_id",
    });
    this.belongsToMany(models.Employee, {
      through: models.EmployeeStore,
      as: "employees",
    });
    this.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
    });
    this.hasMany(models.CashRegister, {
      foreignKey: "recyclery_id",
      as: "caisses",
      onDelete: "CASCADE",
    });
    this.hasMany(models.CollectionPoint, { foreignKey: "recyclery_id" });
    this.belongsToMany(models.Promotion, {
      through: "promotion_store",
      foreignKey: "storeId",
      otherKey: "promotionId",
      as: "promotions",
    });
  }

  static initModel(sequelize: Sequelize) {
    Recyclery.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false },
        address: DataTypes.TEXT,
        phone: {
          type: DataTypes.STRING,
          validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
        },
        email: { type: DataTypes.STRING, validate: { isEmail: true } },
        city: DataTypes.STRING,
        postal_code: {
          type: DataTypes.STRING,
          validate: { is: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/ },
        },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        manager_id: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Recyclery",
        indexes: [{ fields: ["is_active"] }, { fields: ["manager_id"] }],
        hooks: {
          afterUpdate: async (instance, options) => {
            if (options.fields?.includes("name") || options.fields?.includes("is_active")) {
              for (const schedule of instance.TaskSchedules ?? []) {
                await schedule.update({
                  is_recurring: instance.is_active,
                  name: "vente-" + instance.name,
                });
              }
            }
          },
          beforeDestroy: async (recyclery) => {
            const cashRegister = recyclery.sequelize.models.CashRegister;
            const sessions = recyclery.sequelize.models.CashSession;
            if (cashRegister) {
              const caisses = await (recyclery as unknown as {
                getCaisses: (args: unknown) => Promise<Array<{ name: string }>>;
              }).getCaisses({
                include: [
                  {
                    model: sessions,
                    as: "sessions",
                    where: { status: "open" },
                    required: true,
                  },
                ],
              });
              if (Array.isArray(caisses) && caisses.length > 0) {
                throw new createHttpError[424](
                  `Impossible de supprimer la recyclerie car les caisses: "${caisses.map((caisse) => caisse.name)}" sont ouvertes`,
                );
              }
            }
          },
        },
      },
    );
  }
}
