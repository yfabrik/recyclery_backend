"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Donation extends Model {
/**
     *@param {import ('./types/models.js').models} models
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
      estimated_value: DataTypes.FLOAT,
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
