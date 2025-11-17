'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class StoreHours extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Recyclery,{foreignKey:"store_id"})
      
      // define association here
    }
  }
  StoreHours.init({
    day_of_week: DataTypes.STRING,
    time_slot_name: DataTypes.STRING,
    is_open: DataTypes.BOOLEAN,
    open_time: DataTypes.TIME,
    close_time: DataTypes.TIME,
    is_24h: DataTypes.BOOLEAN,
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'StoreHours',
  });
  return StoreHours;
};