"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class EcoOrganism extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  EcoOrganism.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    contact_email: DataTypes.STRING,
    contact_phone: DataTypes.STRING,
    address: DataTypes.STRING,
    website: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'EcoOrganism',
  });
  return EcoOrganism;
};