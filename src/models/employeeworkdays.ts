import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { ModelStatics } from "./db-types.ts";
import type Employee from "./employee.ts";

export default class EmployeeWorkdays extends Model<
  InferAttributes<EmployeeWorkdays>,
  InferCreationAttributes<EmployeeWorkdays>
> {
  declare id: CreationOptional<number>;
  declare day_of_week: string;
  declare time_slot: string;
  declare is_working: boolean;
  declare start_time: string;
  declare end_time: string;
  declare notes: CreationOptional<string | null>;
  declare week: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare employee_id: ForeignKey<Employee["id"]>;

  declare Employee?: NonAttribute<Employee | null>;

  declare getEmployee: BelongsToGetAssociationMixin<Employee>;
  declare setEmployee: BelongsToSetAssociationMixin<Employee, Employee["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Employee, { foreignKey: "employee_id" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        day_of_week: { type: DataTypes.STRING, allowNull: false },
        time_slot: DataTypes.STRING,
        is_working: { type: DataTypes.BOOLEAN, allowNull: false },
        start_time: { type: DataTypes.TIME, allowNull: false },
        end_time: { type: DataTypes.TIME, allowNull: false },
        notes: DataTypes.TEXT,
        week: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EmployeeWorkdays",
        indexes: [
          { fields: ["employee_id"] },
          { fields: ["employee_id", "day_of_week"] },
        ],
      },
    );
  }
}
