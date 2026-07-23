import {
  DataTypes,
  Model,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManyRemoveAssociationMixin,
  type BelongsToManySetAssociationsMixin,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { ModelStatics } from "./db-types.ts";
import type EmployeeWorkdays from "./employeeworkdays.ts";
import type Recyclery from "./recyclery.ts";
import type Skill from "./skill.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";
import type EmployeeStore from "./employeestore.js";

export default class Employee extends Model<
  InferAttributes<Employee>,
  InferCreationAttributes<Employee>
> {
  declare id: CreationOptional<number>;
  declare nom: string;
  declare prenom: string;
  declare isActive: CreationOptional<boolean>;
  declare fullName: NonAttribute<string | undefined>;
  declare workTime: NonAttribute<number | undefined>;
  declare phone: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare EmployeeWorkdays?: NonAttribute<EmployeeWorkdays[]>;
  declare stores?: NonAttribute<
    Array<Recyclery & { EmployeeStore: NonAttribute<EmployeeStore> }>
  >;
  declare Tasks?: NonAttribute<Task[]>;
  declare TaskSchedules?: NonAttribute<TaskSchedule[]>;
  declare skills?: NonAttribute<Skill[]>;

  declare getStores: BelongsToManyGetAssociationsMixin<Recyclery>;
  declare setStores: BelongsToManySetAssociationsMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare addStore: BelongsToManyAddAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare removeStore: BelongsToManyRemoveAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getTasks: BelongsToManyGetAssociationsMixin<Task>;
  declare setTasks: BelongsToManySetAssociationsMixin<Task, Task["id"]>;
  declare addTask: BelongsToManyAddAssociationMixin<Task, Task["id"]>;
  declare getTaskSchedules: BelongsToManyGetAssociationsMixin<TaskSchedule>;
  declare setTaskSchedules: BelongsToManySetAssociationsMixin<
    TaskSchedule,
    TaskSchedule["id"]
  >;
  declare addTaskSchedule: BelongsToManyAddAssociationMixin<
    TaskSchedule,
    TaskSchedule["id"]
  >;
  declare getEmployeeWorkdays: HasManyGetAssociationsMixin<EmployeeWorkdays>;
  declare addEmployeeWorkday: HasManyAddAssociationMixin<
    EmployeeWorkdays,
    EmployeeWorkdays["id"]
  >;
  declare getSkills: BelongsToManyGetAssociationsMixin<Skill>;
  declare setSkills: BelongsToManySetAssociationsMixin<Skill, Skill["id"]>;
  declare addSkill: BelongsToManyAddAssociationMixin<Skill, Skill["id"]>;

  static associate(models: ModelStatics) {
    this.belongsToMany(models.Recyclery, {
      through: models.EmployeeStore,
      foreignKey: "employeeId",
      otherKey: "recycleryId",
      as: "stores",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.Task, {
      through: "employee_task",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.TaskSchedule, {
      through: "employee_schedule",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.EmployeeWorkdays, {
      foreignKey: "employee_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.Skill, {
      foreignKey: "employeeId",
      through: "employee_skill",
      as: "skills",
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
        nom: { type: DataTypes.STRING, allowNull: false },
        prenom: { type: DataTypes.STRING, allowNull: false },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },

        //@ts-expect-error  sequelize virtual marqued as nonattribute
        fullName: {
          type: DataTypes.VIRTUAL,
          get(this: Employee) {
            return `${this.nom} ${this.prenom}`;
          },
        },
        workTime: {
          type: DataTypes.VIRTUAL,
          get(this: Employee) {
            if (!this.EmployeeWorkdays) return undefined;
            const minutes = this.EmployeeWorkdays.reduce((prev, current) => {
              if (!current.start_time || !current.end_time) return prev;
              const start = current.start_time.split(":");
              const end = current.end_time.split(":");
              const time =
                Number(end[0]) * 60 +
                Number(end[1]) -
                (Number(start[0]) * 60 + Number(start[1]));
              return prev + time;
            }, 0);
            return minutes / (60 * 2);
          },
        },
        phone: DataTypes.STRING,
        email: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Employee",
        indexes: [
          { fields: ["nom", "prenom"], unique: true }, //=> enforce unique constraint
        ],
      },
    );
  }
}
