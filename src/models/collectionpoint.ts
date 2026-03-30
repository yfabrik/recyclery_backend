import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class CollectionPoint extends Model<
  InferAttributes<CollectionPoint>,
  InferCreationAttributes<CollectionPoint>
> {
  declare id: CreationOptional<number>;
  declare name: string | null;
  declare address: string | null;
  declare city: string | null;
  declare postal_code: string | null;
  declare contact_person: string | null;
  declare contact_phone: string | null;
  declare contact_email: string | null;
  declare type: "standard" | "entreprise" | "association" | "school" | "hospital" | "other";
  declare notes: string | null;
  declare is_active: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.hasMany(models.TaskSchedule, {
      onDelete: "CASCADE",
      foreignKey: "collection_point_id",
    });
    this.hasMany(models.Task, { foreignKey: "collection_point_id" });
    this.hasMany(models.Arrival, { foreignKey: "collection_point_id" });
  }

  static initModel(sequelize: Sequelize) {
    CollectionPoint.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, unique: true },
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
          validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
          allowNull: true,
        },
        contact_email: {
          type: DataTypes.STRING,
          validate: { isEmail: true },
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM("standard", "entreprise", "association", "school", "hospital", "other"),
          defaultValue: "standard",
        },
        notes: DataTypes.TEXT,
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, modelName: "CollectionPoint", hooks: {} },
    );
  }
}
