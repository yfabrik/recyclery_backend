'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CashRegister extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Store, { foreignKey: "store_id" });
    }
  }
  CashRegister.init(
    {
      name: DataTypes.STRING,
      // store_id: DataTypes.INTEGER, //assoc
      is_active: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "CashRegister",
    }
  );
  return CashRegister;
};
