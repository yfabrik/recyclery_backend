import createHttpError from "http-errors";
import {
  DataTypes,
  Model,
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
  type Sequelize
} from "sequelize";
import {
  COLLECTION_POINT_TYPES,
  type CollectionPointType,
} from "../constants/dbEnums.js";
import logger from "../services/logger.js";
import { withTransaction } from "../utils/transaction.js";
import type Arrival from "./arrival.ts";
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";

export default class CollectionPoint extends Model<
  InferAttributes<CollectionPoint>,
  InferCreationAttributes<CollectionPoint>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare address: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare postal_code: CreationOptional<string | null>;
  declare contact_person: CreationOptional<string | null>;
  declare contact_phone: CreationOptional<string | null>;
  declare contact_email: CreationOptional<string | null>;
  declare type: CreationOptional<CollectionPointType>;
  declare notes: CreationOptional<string | null>;
  declare is_active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare recyclery_id: ForeignKey<Recyclery["id"] | null>;

  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare TaskSchedules?: NonAttribute<TaskSchedule[]>;
  declare Tasks?: NonAttribute<Task[]>;
  declare Arrivals?: NonAttribute<Arrival[]>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getTaskSchedules: HasManyGetAssociationsMixin<TaskSchedule>;
  declare addTaskSchedule: HasManyAddAssociationMixin<
    TaskSchedule,
    TaskSchedule["id"]
  >;
  declare getTasks: HasManyGetAssociationsMixin<Task>;
  declare addTask: HasManyAddAssociationMixin<Task, Task["id"]>;
  declare getArrivals: HasManyGetAssociationsMixin<Arrival>;
  declare countArrivals: HasManyCountAssociationsMixin;
  declare addArrival: HasManyAddAssociationMixin<Arrival, Arrival["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.hasMany(models.TaskSchedule, {
      foreignKey: "collection_point_id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.Task, {
      foreignKey: "collection_point_id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.Arrival, {
      foreignKey: "collection_point_id",
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
        name: { type: DataTypes.STRING, unique: true, allowNull: false },
        address: DataTypes.TEXT,
        city: DataTypes.STRING,
        postal_code: {
          type: DataTypes.STRING,
          validate: { is: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/ },
        },
        contact_person: {
          type: DataTypes.STRING,
          validate: { isAlphanumeric: true },
        },
        contact_phone: {
          type: DataTypes.STRING,
          validate: {
            is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/,
          },
          allowNull: true,
        },
        contact_email: {
          type: DataTypes.STRING,
          validate: { isEmail: true },
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM(...COLLECTION_POINT_TYPES),
          defaultValue: "standard",
          allowNull: false,
        },
        notes: DataTypes.TEXT,
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
        modelName: "CollectionPoint",
        hooks: {
          afterUpdate: async (instance, options) => {
            //y'a globalement le meme hook dans recyclery.ts
            if (
              !instance.changed("name") &&
              !instance.changed("is_active") &&
              !instance.changed("recyclery_id")
            )
              return;
            await withTransaction(
              instance.sequelize!,
              options.transaction,
              async (transaction) => {
                for (const schedule of await instance.getTaskSchedules({
                  transaction,
                })) {
                  await schedule.update(
                    {
                      is_recurring: instance.is_active,
                      store_id: instance.recyclery_id,
                      name: instance.name,
                    },
                    { transaction },
                  );
                }
              },
            );
          },
          beforeDestroy: async (collectionPoint, options) => {
            const arrivals = await collectionPoint.countArrivals();
            if (arrivals > 0) {
              throw new createHttpError[424](
                "Impossible de supprimer un point de collecte qui a des arrivages",
              );
            }

            // Destroy owned schedules via Sequelize first; TaskSchedules.collection_point_id
            // is SET NULL at DB so selective category cleanup must run in app hooks.
            await withTransaction(
              collectionPoint.sequelize!,
              options.transaction,
              async (transaction) => {

                const Task = collectionPoint.sequelize.models.Task as
                  | ModelStatic<Task>
                  | undefined;
                if (!Task) return;
                // delete all point tasks
                const deletedPointTasks = await Task.destroy({
                  where: {
                    collection_point_id: collectionPoint.id,
                    category: "point",
                  },
                  transaction,
                });
                if (deletedPointTasks > 0) {
                  logger.info(
                    `Deleted ${deletedPointTasks} point task(s) when destroying collection point ${collectionPoint.id}`,
                  );
                }

                const schedules = await collectionPoint.getTaskSchedules({
                  transaction,
                });
                for (const schedule of schedules) {
                  await schedule.destroy({ transaction });
                }

                // const now = new Date();
                // const pastNullified = (
                //   await Task.update(
                //     { collection_point_id: null },
                //     {
                //       where: {
                //         collection_point_id: collectionPoint.id,
                //         scheduled_date: { [Op.lt]: now },
                //       },
                //       transaction,
                //     },
                //   )
                // )[0];
                // const deletedFuture = await Task.destroy({
                //   where: {
                //     collection_point_id: collectionPoint.id,
                //     scheduled_date: { [Op.gte]: now },
                //   },
                //   transaction,
                // });
                // if (pastNullified > 0) {
                //   logger.info(
                //     `Set collection_point_id to null for ${pastNullified} past task(s) when destroying collection point ${collectionPoint.id}`,
                //   );
                // }
                // if (deletedFuture > 0) {
                //   logger.info(
                //     `Deleted ${deletedFuture} future task(s) when destroying collection point ${collectionPoint.id}`,
                //   );
                // }
              },
            );
          },
        },
      },
    );
  }
}
