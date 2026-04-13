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
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type CashRegister from "./cashregister.ts";
import type CashSession from "./cashsession.js";
import type CollectionPoint from "./collectionpoint.ts";
import type { ModelStatics } from "./db-types.ts";
import type Donation from "./donation.ts";
import type Employee from "./employee.ts";
import type LabeledItem from "./labeleditem.ts";
import type Promotion from "./promotion.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";
import type User from "./user.ts";

export default class Recyclery extends Model<
  InferAttributes<Recyclery>,
  InferCreationAttributes<Recyclery>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare address: CreationOptional<string | null>;
  declare phone: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare postal_code: CreationOptional<string | null>;
  declare is_active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare manager_id: ForeignKey<User["id"] | null>;

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
  declare addLabeledItem: HasManyAddAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare getDonations: HasManyGetAssociationsMixin<Donation>;
  declare addDonation: HasManyAddAssociationMixin<Donation, Donation["id"]>;
  declare getTasks: HasManyGetAssociationsMixin<Task>;
  declare addTask: HasManyAddAssociationMixin<Task, Task["id"]>;
  declare getTaskSchedules: HasManyGetAssociationsMixin<TaskSchedule>;
  declare addTaskSchedule: HasManyAddAssociationMixin<
    TaskSchedule,
    TaskSchedule["id"]
  >;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<
    Employee,
    Employee["id"]
  >;
  declare addEmployee: BelongsToManyAddAssociationMixin<
    Employee,
    Employee["id"]
  >;
  declare getManager: BelongsToGetAssociationMixin<User>;
  declare setManager: BelongsToSetAssociationMixin<User, User["id"]>;
  declare getCaisses: HasManyGetAssociationsMixin<CashRegister>;
  declare addCaisse: HasManyAddAssociationMixin<
    CashRegister,
    CashRegister["id"]
  >;
  declare createCaisse: HasManyCreateAssociationMixin<CashRegister>

  declare getCollectionPoints: HasManyGetAssociationsMixin<CollectionPoint>;
  declare addCollectionPoint: HasManyAddAssociationMixin<
    CollectionPoint,
    CollectionPoint["id"]
  >;
  declare getPromotions: BelongsToManyGetAssociationsMixin<Promotion>;
  declare setPromotions: BelongsToManySetAssociationsMixin<
    Promotion,
    Promotion["id"]
  >;
  declare addPromotion: BelongsToManyAddAssociationMixin<
    Promotion,
    Promotion["id"]
  >;

  static associate(models: ModelStatics) {
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
      foreignKey: "recycleryId",
      otherKey: "employeeId",
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
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        address: DataTypes.TEXT,
        phone: {
          type: DataTypes.STRING,
          validate: {
            is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/,
          },
        },
        email: { type: DataTypes.STRING, validate: { isEmail: true } },
        city: DataTypes.STRING,
        postal_code: {
          type: DataTypes.STRING,
          validate: { is: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/ },
        },
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
        modelName: "Recyclery",
        indexes: [{ fields: ["is_active"] }, { fields: ["manager_id"] }],
        hooks: {
          afterUpdate: async (instance, options) => {
            if (!instance.changed("name") && !instance.changed("is_active")) return

            await instance.sequelize.transaction(async t => {

              for (const schedule of await instance.getTaskSchedules({
                where: { category: "vente" },
              })) {
                await schedule.update({
                  is_recurring: instance.is_active,
                  name: "vente-" + instance.name,
                }, { transaction: options.transaction ?? t });
              }
            })

          },
          beforeDestroy: async (recyclery) => {
            const cashRegister = recyclery.sequelize.models
              .CashRegister as ModelStatic<CashRegister>;
            const sessions = recyclery.sequelize.models
              .CashSession as ModelStatic<CashSession>;
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
