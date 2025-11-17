'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmployeeWorkdays extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  EmployeeWorkdays.init({
    day_of_week: DataTypes.STRING,
    time_slot: DataTypes.STRING,
    is_working: DataTypes.BOOLEAN,
    start_time: DataTypes.TIME,
    end_time: DataTypes.STRING,
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'EmployeeWorkdays',
  });
  return EmployeeWorkdays;
};