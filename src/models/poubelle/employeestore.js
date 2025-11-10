'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class EmployeeStore extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  // TABLE JOIN TABLE
  EmployeeStore.init({
    employee_id: DataTypes.INTEGER,//assoc
    store_id: DataTypes.INTEGER,//assoc
    // is_primary: DataTypes.BOOLEAN//assoc ? sans doute le manager 
  }, {
    sequelize,
    modelName: 'EmployeeStore',
  });
  return EmployeeStore;
};