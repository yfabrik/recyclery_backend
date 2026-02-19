"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Sale extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: "sold_by" });
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    }
  }
  Sale.init(
    {
      customer_name: DataTypes.STRING,
      customer_email: DataTypes.STRING,
      total_amount: DataTypes.DECIMAL,
      payment_method: { type: DataTypes.STRING, defaultValue: "cash" }, //enum ?table ?
      status: { type: DataTypes.STRING, defaultValue: "completed" },
      // sold_by: DataTypes.INTEGER, //assoc
      // recyclery_id: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "Sale",
    },
  );
  return Sale;
};
