import {
  DataTypes,
  Model,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type EmployeeWorkdays from "./employeeworkdays.ts";
import type Recyclery from "./recyclery.ts";
import type Skill from "./skill.ts";
import type Task from "./task.ts";
import type TaskSchedule from "./taskschedule.ts";

export default class Employee extends Model<InferAttributes<Employee>, InferCreationAttributes<Employee>> {
  declare id: CreationOptional<number>;
  declare nom: string;
  declare prenom: string;
  declare isActive: boolean;
  declare fullName: string | undefined;
  declare workTime: number | undefined;
  declare phone: string | null;
  declare email: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare EmployeeWorkdays?: NonAttribute<EmployeeWorkdays[]>;

  declare stores?: NonAttribute<Recyclery[]>;
  declare Tasks?: NonAttribute<Task[]>;
  declare TaskSchedules?: NonAttribute<TaskSchedule[]>;
  declare skills?: NonAttribute<Skill[]>;

  declare getStores: BelongsToManyGetAssociationsMixin<Recyclery>;
  declare setStores: BelongsToManySetAssociationsMixin<Recyclery, number>;
  declare addStore: BelongsToManyAddAssociationMixin<Recyclery, number>;
  declare getTasks: BelongsToManyGetAssociationsMixin<Task>;
  declare setTasks: BelongsToManySetAssociationsMixin<Task, number>;
  declare addTask: BelongsToManyAddAssociationMixin<Task, number>;
  declare getTaskSchedules: BelongsToManyGetAssociationsMixin<TaskSchedule>;
  declare setTaskSchedules: BelongsToManySetAssociationsMixin<TaskSchedule, number>;
  declare addTaskSchedule: BelongsToManyAddAssociationMixin<TaskSchedule, number>;
  declare getEmployeeWorkdays: HasManyGetAssociationsMixin<EmployeeWorkdays>;
  declare addEmployeeWorkday: HasManyAddAssociationMixin<EmployeeWorkdays, number>;
  declare getSkills: BelongsToManyGetAssociationsMixin<Skill>;
  declare setSkills: BelongsToManySetAssociationsMixin<Skill, number>;
  declare addSkill: BelongsToManyAddAssociationMixin<Skill, number>;

  static associate(models: Models) {
    this.belongsToMany(models.Recyclery, {
      through: models.EmployeeStore,
      as: "stores",
    });
    this.belongsToMany(models.Task, { through: "employee_task" });
    this.belongsToMany(models.TaskSchedule, { through: "employee_schedule" });
    this.hasMany(models.EmployeeWorkdays, {
      foreignKey: "employee_id",
    });
    this.belongsToMany(models.Skill, {
      foreignKey: "employeeId",
      through: "employee_skill",
      as: "skills",
    });
  }

  static initModel(sequelize: Sequelize) {
    Employee.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        nom: { type: DataTypes.STRING, allowNull: false },
        prenom: { type: DataTypes.STRING, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
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
                Number(end[0]) * 60 + Number(end[1]) - (Number(start[0]) * 60 + Number(start[1]));
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
      },
    );
  }
}
