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
      this.hasMany(models.TaskSchedule,{foreignKey:"task_id"})
    }
  }
  Task.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    category: DataTypes.STRING,
    priority: DataTypes.STRING,
    estimated_duration: DataTypes.INTEGER,
    required_skills: DataTypes.TEXT,
    location: DataTypes.STRING,
    equipment_needed: DataTypes.TEXT,
    hourly_rate: DataTypes.DECIMAL,
    is_recurring: DataTypes.BOOLEAN,
    recurrence_pattern: DataTypes.STRING,
    assigned_to: DataTypes.INTEGER,//assoc
    notes: DataTypes.TEXT,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Task',
  });
  return Task;
};