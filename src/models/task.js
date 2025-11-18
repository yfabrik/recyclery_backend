'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class Task extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsToMany(models.User, { through: "task_user" })
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