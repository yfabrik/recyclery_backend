"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class Donation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.belongsTo(models.User, { foreignKey: "received_by" });
    }
  }
  Donation.init(
    {
      donor_name: DataTypes.STRING,
      donor_phone: DataTypes.STRING,
      donor_email: DataTypes.STRING,
      item_description: DataTypes.TEXT,
      estimated_value: DataTypes.DECIMAL,
      status: { type: DataTypes.STRING, defaultValue: "pending" },
      // recyclery_id: DataTypes.INTEGER,//assoc
      // received_by: DataTypes.INTEGER,//assoc
      received_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Donation",
    }
  );
  return Donation;
};
