import {
  DataTypes,
  Model,
  Transaction,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Arrival from "./arrival.ts";
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";
import {
  COLLECTION_POINT_TYPES,
  type CollectionPointType,
} from "../constants/dbEnums.js";

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
  declare addArrival: HasManyAddAssociationMixin<Arrival, Arrival["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.hasMany(models.TaskSchedule, {
      onDelete: "CASCADE",
      foreignKey: "collection_point_id",
    });
    this.hasMany(models.Task, { foreignKey: "collection_point_id" });
    this.hasMany(models.Arrival, { foreignKey: "collection_point_id" });
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
            const propagateUpdates = async (transaction: Transaction) => {
              for (const schedule of await instance.getTaskSchedules({
                transaction: transaction ?? null,
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
            };

            if (options.transaction) {
              await propagateUpdates(options.transaction);
              return;
            }

            await instance.sequelize.transaction(async (t) => {
              await propagateUpdates(t);
            });
          },
        },
      },
    );
  }
}
