'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Store.belongsTo(models.User, { as: "manager", foreignKey: "manager_id" });
      Store.hasMany(models.LabeledItem, { foreignKey: "store_id" });
      Store.belongsToMany(models.User, {
        through: "EmployeeStore",
        foreignKey: "store_id",
      });
    }
  }

  //duplicate avec recyclerie ?????
  Store.init(
    {
      name: DataTypes.STRING,
      address: DataTypes.TEXT,
      city: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      phone: DataTypes.STRING,
      email: DataTypes.STRING,
      manager_id: DataTypes.INTEGER,//assoc
      is_active: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Store",
    }
  );
  return Store;
};
