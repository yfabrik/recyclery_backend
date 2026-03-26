import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

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
  declare EmployeeWorkdays?: Array<{ start_time: string; end_time: string }>;

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
