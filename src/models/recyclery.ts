import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type CashRegister from "./cashregister.ts";
import type CollectionPoint from "./collectionpoint.ts";
import type Donation from "./donation.ts";
import type Employee from "./employee.ts";
import type LabeledItem from "./labeleditem.ts";
import type Promotion from "./promotion.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";
import type User from "./user.ts";
import type CashSession from "./cashsession.js";

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
  declare TaskSchedules?: NonAttribute<TaskSchedule[]>;

  declare LabeledItems?: NonAttribute<LabeledItem[]>;
  declare Donations?: NonAttribute<Donation[]>;
  declare Tasks?: NonAttribute<Task[]>;
  declare employees?: NonAttribute<Employee[]>;
  declare manager?: NonAttribute<User | null>;
  declare caisses?: NonAttribute<CashRegister[]>;
  declare CollectionPoints?: NonAttribute<CollectionPoint[]>;
  declare promotions?: NonAttribute<Promotion[]>;

  declare getLabeledItems: HasManyGetAssociationsMixin<LabeledItem>;
  declare addLabeledItem: HasManyAddAssociationMixin<LabeledItem, number>;
  declare getDonations: HasManyGetAssociationsMixin<Donation>;
  declare addDonation: HasManyAddAssociationMixin<Donation, number>;
  declare getTasks: HasManyGetAssociationsMixin<Task>;
  declare addTask: HasManyAddAssociationMixin<Task, number>;
  declare getTaskSchedules: HasManyGetAssociationsMixin<TaskSchedule>;
  declare addTaskSchedule: HasManyAddAssociationMixin<TaskSchedule, number>;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<Employee, number>;
  declare addEmployee: BelongsToManyAddAssociationMixin<Employee, number>;
  declare getManager: BelongsToGetAssociationMixin<User>;
  declare setManager: BelongsToSetAssociationMixin<User, number>;
  declare getCaisses: HasManyGetAssociationsMixin<CashRegister>;
  declare addCaisse: HasManyAddAssociationMixin<CashRegister, number>;
  declare getCollectionPoints: HasManyGetAssociationsMixin<CollectionPoint>;
  declare addCollectionPoint: HasManyAddAssociationMixin<CollectionPoint, number>;
  declare getPromotions: BelongsToManyGetAssociationsMixin<Promotion>;
  declare setPromotions: BelongsToManySetAssociationsMixin<Promotion, number>;
  declare addPromotion: BelongsToManyAddAssociationMixin<Promotion, number>;

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
          afterUpdate: async (instance) => {
            if (instance.changed("name") || instance.changed("is_active")) {
              for (const schedule of instance.TaskSchedules ?? []) {
                await schedule.update({
                  is_recurring: instance.is_active,
                  name: "vente-" + instance.name,
                });
              }
            }
          },
          beforeDestroy: async (recyclery) => {
            const cashRegister = recyclery.sequelize.models.CashRegister as ModelStatic<CashRegister>;
            const sessions = recyclery.sequelize.models.CashSession as ModelStatic<CashSession>;
            if (cashRegister) {
              const caisses = await recyclery.getCaisses({
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
