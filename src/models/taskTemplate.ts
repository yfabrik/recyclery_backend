import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.js";

export default class TaskTemplate extends Model<InferAttributes<TaskTemplate>, InferCreationAttributes<TaskTemplate>> {
  declare id: CreationOptional<number>;
  declare name: string | null;
  declare description: string | null;
  declare category: "vente" | "point" | "collection" | "custom";
  declare scheduled_date: Date | null;
  declare start_time: string | null;
  declare end_time: string | null;
  declare priority: string | null;
  declare status: string | null;
  declare notes: string | null;
  declare hourly_rate: string | null;
  declare required_skills: string | null;
  declare location: string | null;
  declare equipment_needed: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(_models: Models) {}

  static initModel(sequelize: Sequelize) {
    TaskTemplate.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        category: {
          type: DataTypes.ENUM("vente", "point", "collection", "custom"),
          allowNull: false,
        },
        scheduled_date: DataTypes.DATE,
        start_time: DataTypes.TIME,
        end_time: DataTypes.TIME,
        priority: DataTypes.STRING,
        status: DataTypes.STRING,
        notes: DataTypes.TEXT,
        hourly_rate: DataTypes.DECIMAL,
        required_skills: DataTypes.TEXT,
        location: DataTypes.STRING,
        equipment_needed: DataTypes.TEXT,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "TaskTemplate",
      },
    );
  }
}
