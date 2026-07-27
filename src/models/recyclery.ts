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
  type Sequelize
} from "sequelize";
import logger from "../services/logger.js";
import { withTransaction } from "../utils/transaction.js";
import type CashRegister from "./cashregister.ts";
import type CashSession from "./cashsession.js";
import type CollectionPoint from "./collectionpoint.ts";
import type { ModelStatics } from "./db-types.ts";
import type Donation from "./donation.ts";
import type Employee from "./employee.ts";
import type EmployeeStore from "./employeestore.js";
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
  declare employees?: NonAttribute<
    Array<Employee & { EmployeeStore: NonAttribute<EmployeeStore> }>
  >;
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
  declare createCaisse: HasManyCreateAssociationMixin<CashRegister>;

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
      foreignKey: "store_id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.TaskSchedule, {
      foreignKey: "store_id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.Employee, {
      through: models.EmployeeStore,
      foreignKey: "recycleryId",
      otherKey: "employeeId",
      as: "employees",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.CashRegister, {
      foreignKey: "recyclery_id",
      as: { singular: "caisse", plural: "caisses" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.CollectionPoint, { foreignKey: "recyclery_id" });
    this.belongsToMany(models.Promotion, {
      through: "promotion_store",
      foreignKey: "storeId",
      otherKey: "promotionId",
      as: "promotions",
      onDelete: "CASCADE",
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
            if (!instance.changed("name") && !instance.changed("is_active"))
              return;

            await withTransaction(
              instance.sequelize!,
              options.transaction,
              async (tx) => {
                const schedules = await instance.getTaskSchedules({
                  where: { category: "vente" },
                  transaction: tx,
                });
                for (const schedule of schedules) {
                  await schedule.update(
                    {
                      is_recurring: instance.is_active,
                      name: `vente-${instance.name}`,
                    },
                    { transaction: tx },
                  );
                }
              },
            );
          },
          beforeDestroy: async (recyclery, options) => {
            const CashSession = recyclery.sequelize.models
              .CashSession as ModelStatic<CashSession>;
            const CashRegister = recyclery.sequelize.models
              .CashRegister as ModelStatic<CashRegister>;
            const SalesTransaction = recyclery.sequelize.models
              .SalesTransaction as ModelStatic<
                import("./salestransaction.ts").default
              >;

            const openCaisses = await recyclery.getCaisses({
              include: [
                {
                  model: CashSession,
                  as: "sessions",
                  where: { status: "open" },
                  required: true,
                },
              ],
            });
            if (Array.isArray(openCaisses) && openCaisses.length > 0) {
              throw new createHttpError[424](
                `Impossible de supprimer la recyclerie car les caisses: "${openCaisses.map((caisse) => caisse.name)}" sont ouvertes`,
              );
            }

            const salesCount = await SalesTransaction.count({
              include: [
                {
                  model: CashSession,
                  required: true,
                  include: [
                    {
                      model: CashRegister,
                      required: true,
                      where: { recyclery_id: recyclery.id },
                    },
                  ],
                },
              ],
            });
            if (salesCount > 0) {
              throw new createHttpError[424](
                "Impossible de supprimer la recyclerie car des ventes sont liées aux caisses",
              );
            }


            withTransaction(
              recyclery.sequelize!,
              options.transaction,
              async (transaction) => {
                //delete vente schedules
                // set null other schedules


                // goes first so delete all vente tasks
                const Task = recyclery.sequelize.models.Task as
                  | ModelStatic<Task>
                  | undefined;
                if (!Task) return;
                // const now = new Date();
                // const pastNullified = (
                //   await Task.update(
                //     { store_id: null },
                //     {
                //       where: {
                //         store_id: recyclery.id,
                //         category: "vente",
                //         scheduled_date: { [Op.lt]: now },
                //       },
                //       transaction,
                //     },
                //   )
                // )[0];
                const deletedTasks = await Task.destroy({
                  where: {
                    store_id: recyclery.id,
                    category: "vente",
                    // scheduled_date: { [Op.gte]: now },
                  },
                  transaction,
                });
                // if (pastNullified > 0) {
                //   logger.info(
                //     `Set store_id to null for ${pastNullified} past vente task(s) when destroying recyclery ${recyclery.id}`,
                //   );
                // }
                if (deletedTasks > 0) {
                  logger.info(
                    `Deleted ${deletedTasks} future vente task(s) when destroying recyclery ${recyclery.id}`,
                  );
                }

                const schedules = await recyclery.getTaskSchedules({
                  where: { category: "vente" }, transaction
                })
                for (const schedule of schedules) {
                  await schedule.destroy({ transaction });
                }

                // const Schedule = recyclery.sequelize.models.TaskSchedule as
                //   | ModelStatic<TaskSchedule>
                //   | undefined;
                // if (!Schedule) return;
                // const otherSchedules = await Schedule.update(
                //   { store_id: null },
                //   { where: { store_id: recyclery.id, category: { [Op.not]: "vente" } }, transaction },
                // );
                // if (otherSchedules[0] > 0) {
                //   logger.info(
                //     `Set store_id to null for ${otherSchedules[0]} other task(s) when destroying recyclery ${recyclery.id}`,
                //   );
                // }
                // const otherTasks = await Task.update(
                //   { store_id: null },
                //   { where: { store_id: recyclery.id, category: { [Op.not]: "vente" } }, transaction },
                // );
                // if (otherTasks[0] > 0) {
                //   logger.info(
                //     `Set store_id to null for ${otherTasks[0]} other task(s) when destroying recyclery ${recyclery.id}`,
                //   );
                // }
              })
          },
        },
      },
    );
  }
}
