'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SalesItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  //comprend pas tros l(interet) ça a l'air  de faire item par item donc pour quoi quantity et total, le reste existe deja dans item
  SalesItem.init(
    {
      transaction_id: DataTypes.INTEGER, //assoc
      labeled_item_id: DataTypes.INTEGER, //assoc
      barcode: DataTypes.STRING, //item a un barcode
      name: DataTypes.STRING, //item a un name
      price: DataTypes.DECIMAL,
      quantity: DataTypes.INTEGER,
      total_price: DataTypes.DECIMAL,
    },
    {
      sequelize,
      modelName: "SalesItem",
    }
  );
  return SalesItem;
};
