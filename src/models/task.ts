import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManyRemoveAssociationMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models, ModelStatics } from "./db-types.ts";
import type CollectionPoint from "./collectionpoint.ts";
import type Employee from "./employee.ts";
import type Recyclery from "./recyclery.ts";
import type TaskSchedule from "./taskschedule.ts";

export default class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare category: "vente" | "point" | "collection" | "custom";
  declare priority: CreationOptional<string | null>;
  declare required_skills: CreationOptional<string | null>;
  declare location: CreationOptional<string | null>;
  declare equipment_needed: CreationOptional<string | null>;
  declare hourly_rate: CreationOptional<string | null>;
  declare scheduled_date: Date;
  declare start_time: Date;
  declare end_time: Date;
  declare notes: CreationOptional<string | null>;
  declare status: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare day_of_week: NonAttribute<string | null>;

  declare schedule_id: ForeignKey<TaskSchedule["id"]|null>;
  declare store_id: ForeignKey<Recyclery["id"]|null>;
  declare collection_point_id: ForeignKey<CollectionPoint["id"]|null>;

  declare TaskSchedule?: NonAttribute<TaskSchedule | null>;
  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare CollectionPoint?: NonAttribute<CollectionPoint | null>;
  declare Employees?: NonAttribute<Employee[]>;

  declare getTaskSchedule: BelongsToGetAssociationMixin<TaskSchedule>;
  declare setTaskSchedule: BelongsToSetAssociationMixin<TaskSchedule, TaskSchedule["id"]>;
  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, Recyclery["id"]>;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<CollectionPoint, CollectionPoint["id"]>;
  declare getEmployees: BelongsToManyGetAssociationsMixin<Employee>;
  declare setEmployees: BelongsToManySetAssociationsMixin<Employee, Employee["id"]>;
  declare addEmployee: BelongsToManyAddAssociationMixin<Employee, Employee["id"]>;
  declare removeEmployee: BelongsToManyRemoveAssociationMixin<Employee, Employee["id"]>

  static associate(models: ModelStatics) {
    this.belongsTo(models.TaskSchedule, { foreignKey: "schedule_id" });
    this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
    this.belongsTo(models.CollectionPoint, { foreignKey: "collection_point_id" });
    this.belongsToMany(models.Employee, { through: "employee_task" });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false },
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
        scheduled_date: { type: DataTypes.DATE, allowNull: false },
        // @ts-expect-error
        day_of_week: {
          type: DataTypes.VIRTUAL,
          get(this: Task) {
            if (!this.scheduled_date) return null;
            const d = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(this.scheduled_date);
            return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
          },
        },
        start_time:  { type: DataTypes.DATE, allowNull: false },
        end_time:  { type: DataTypes.DATE, allowNull: false },
        notes: DataTypes.TEXT,
        status: DataTypes.STRING,

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
