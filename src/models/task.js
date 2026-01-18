'use strict';
import { Model } from 'sequelize';
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Task extends Model {
    /**
         *@param {import ('./types/models.js').models} models
         */
    static associate(models) {
      this.belongsToMany(models.User, { through: "task_user" })
      this.belongsTo(models.TaskSchedule, { foreignKey: "schedule_id" })

    }
  }
  Task.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    category: { type: DataTypes.ENUM("vente", "point", "collection", "custom"), allowNull: false },
    priority: DataTypes.STRING,
    // estimated_duration: DataTypes.INTEGER,
    required_skills: DataTypes.TEXT,
    location: DataTypes.STRING,
    equipment_needed: DataTypes.TEXT,
    hourly_rate: DataTypes.DECIMAL,
    // is_recurring: DataTypes.BOOLEAN,
    // recurrence_pattern: DataTypes.STRING,
    // assigned_to: DataTypes.INTEGER,//assoc
    scheduled_date: DataTypes.DATE,
    day_of_week: {
      type: DataTypes.VIRTUAL,
      get() {
        new Intl.DateTimeFormat("fr-FR", { weekday: "long", }).format(this.scheduled_date)
      }
    },
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,

    notes: DataTypes.TEXT,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Task',
  });
  return Task;
};