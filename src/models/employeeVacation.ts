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
import {
  VACATION_REASONS,
  type VacationReason,
} from "../constants/dbEnums.js";
import type { ModelStatics } from "./db-types.ts";
import type Employee from "./employee.ts";

export default class EmployeeVacation extends Model<
  InferAttributes<EmployeeVacation>,
  InferCreationAttributes<EmployeeVacation>
> {
  declare id: CreationOptional<number>;

  declare start_date: Date;
  declare end_date: Date;
  declare notes: CreationOptional<string | null>;
  declare reason: VacationReason;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare employee_id: ForeignKey<Employee["id"]>;

  declare Employee?: NonAttribute<Employee | null>;

  declare getEmployee: BelongsToGetAssociationMixin<Employee>;
  declare setEmployee: BelongsToSetAssociationMixin<Employee, Employee["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Employee, {
      foreignKey: { name: "employee_id", allowNull: false },
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
        reason: {
          type: DataTypes.ENUM(...VACATION_REASONS),
          allowNull: false,
          defaultValue: "other",
        },
        start_date: { type: DataTypes.DATE, allowNull: false },
        end_date: { type: DataTypes.DATE, allowNull: false },
        notes: DataTypes.TEXT,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EmployeeVacation",
        indexes: [{ fields: ["employee_id"] }],
      },
    );
  }
}
