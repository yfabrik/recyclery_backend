import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { ModelStatics } from "./db-types.ts";
import type Employee from "./employee.ts";
import type Task from "./task.ts";

/**
 * A Time range: the part of a Task an Employee covers under an Assignment
 * (an `employee_task` row). Times are time of day, like Workday.
 * See docs/adr/0001-time-ranges-in-a-separate-table.md.
 */
export default class EmployeeTaskTimeRange extends Model<
  InferAttributes<EmployeeTaskTimeRange>,
  InferCreationAttributes<EmployeeTaskTimeRange>
> {
  declare id: CreationOptional<number>;
  declare start_time: string;
  declare end_time: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare EmployeeId: ForeignKey<Employee["id"]>;
  declare TaskId: ForeignKey<Task["id"]>;

  declare Employee?: NonAttribute<Employee | null>;
  declare Task?: NonAttribute<Task | null>;

  declare getEmployee: BelongsToGetAssociationMixin<Employee>;
  declare getTask: BelongsToGetAssociationMixin<Task>;

  static associate(models: ModelStatics) {
    // The real constraint is the composite foreign key (EmployeeId, TaskId) to
    // employee_task, created by the migrations; Sequelize cannot declare one.
    this.belongsTo(models.Employee, {
      foreignKey: { name: "EmployeeId", allowNull: false },
      constraints: false,
    });
    this.belongsTo(models.Task, {
      foreignKey: { name: "TaskId", allowNull: false },
      constraints: false,
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
        start_time: { type: DataTypes.TIME, allowNull: false },
        end_time: { type: DataTypes.TIME, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EmployeeTaskTimeRange",
        tableName: "employee_task_time_range",
        indexes: [{ fields: ["EmployeeId", "TaskId"] }],
      },
    );
  }
}
