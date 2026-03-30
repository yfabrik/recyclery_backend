import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class Skill extends Model<InferAttributes<Skill>, InferCreationAttributes<Skill>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare isActive: boolean;
  declare description: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsToMany(models.Employee, {
      foreignKey: "skillId",
      as: "employees",
      through: "employee_skill",
    });
  }

  static initModel(sequelize: Sequelize) {
    Skill.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        description: { type: DataTypes.TEXT },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { sequelize, modelName: "Skill" },
    );
  }
}
