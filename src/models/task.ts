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
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type CollectionPoint from "./collectionpoint.ts";
import type Employee from "./employee.ts";
import type Recyclery from "./recyclery.ts";
import type TaskSchedule from "./taskschedule.ts";

export default class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<number>;
  declare name: string | null;
  declare description: string | null;
  declare category: "vente" | "point" | "collection" | "custom";
  declare priority: string | null;
  declare required_skills: string | null;
  declare location: string | null;
  declare equipment_needed: string | null;
  declare hourly_rate: string | null;
  declare schedule_id: ForeignKey<number | null>;
  declare store_id: ForeignKey<number | null>;
  declare scheduled_date: Date | null;
  declare day_of_week: string | null;
  declare start_time: Date | null;
  declare end_time: Date | null;
  declare notes: string | null;
  declare status: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare TaskSchedule?: NonAttribute<TaskSchedule | null>;
  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare CollectionPoint?: NonAttribute<CollectionPoint | null>;
  declare Employees?: NonAttribute<Employee[]>;

  declare getTaskSchedule: BelongsToGetAssociationMixin<TaskSchedule>;
  declare setTaskSchedule: BelongsToSetAssociationMixin<TaskSchedule, number>;
  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, number>;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<CollectionPoint, number>;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<Employee, number>;
  declare addEmployee: BelongsToManyAddAssociationMixin<Employee, number>;

  static associate(models: Models) {
    this.belongsTo(models.TaskSchedule, { foreignKey: "schedule_id" });
    this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
    this.belongsTo(models.CollectionPoint, { foreignKey: "collection_point_id" });
    this.belongsToMany(models.Employee, { through: "employee_task" });
  }

  static initModel(sequelize: Sequelize) {
    Task.init(
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
        priority: DataTypes.STRING,
        required_skills: DataTypes.TEXT,
        location: DataTypes.STRING,
        equipment_needed: DataTypes.TEXT,
        hourly_rate: DataTypes.DECIMAL,
        scheduled_date: DataTypes.DATE,
        day_of_week: {
          type: DataTypes.VIRTUAL,
          get(this: Task) {
            if (!this.scheduled_date) return null;
            const d = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(this.scheduled_date);
            return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
          },
        },
        start_time: DataTypes.DATE,
        end_time: DataTypes.DATE,
        notes: DataTypes.TEXT,
        status: DataTypes.STRING,
        schedule_id: DataTypes.INTEGER,
        store_id: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Task",
        indexes: [{ fields: ["schedule_id"] }, { fields: ["scheduled_date"] }, { fields: ["status"] }],
      },
    );
  }
}
