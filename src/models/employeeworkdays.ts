import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class EmployeeWorkdays extends Model<
  InferAttributes<EmployeeWorkdays>,
  InferCreationAttributes<EmployeeWorkdays>
> {
  declare id: CreationOptional<number>;
  declare day_of_week: string | null;
  declare time_slot: string | null;
  declare is_working: boolean | null;
  declare start_time: string | null;
  declare end_time: string | null;
  declare notes: string | null;
  declare week: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.belongsTo(models.Employee, { foreignKey: "employee_id" });
  }

  static initModel(sequelize: Sequelize) {
    EmployeeWorkdays.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        day_of_week: DataTypes.STRING,
        time_slot: DataTypes.STRING,
        is_working: DataTypes.BOOLEAN,
        start_time: DataTypes.TIME,
        end_time: DataTypes.STRING,
        notes: DataTypes.TEXT,
        week: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EmployeeWorkdays",
        indexes: [{ fields: ["employee_id"] }, { fields: ["employee_id", "day_of_week"] }],
      },
    );
  }
}
