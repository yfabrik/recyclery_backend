'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class TaskSchedule extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TaskSchedule.init({
    task_id: DataTypes.INTEGER,//assoc
    assigned_to: DataTypes.INTEGER,//assoc //task a deja un assigned 
    store_id: DataTypes.INTEGER,//assoc
    scheduled_date: DataTypes.DATE,
    start_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    status: DataTypes.STRING,
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'TaskSchedule',
  });
  return TaskSchedule;
};