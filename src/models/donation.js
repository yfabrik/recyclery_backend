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
      donor_name: {
        type: DataTypes.STRING,
        validate: { isAlphanumeric: true },
      },
      donor_phone: {
        type: DataTypes.STRING,
        validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
      },
      donor_email: { type: DataTypes.STRING, validate: { isEmail: true } },
      item_description: DataTypes.TEXT,
      estimated_value: DataTypes.DECIMAL(10, 2),
      status: {
        type: DataTypes.ENUM("pending", "accepted", "rejected"),
        defaultValue: "pending",
      },
      received_at: DataTypes.DATE,
      donorContact: {
        type: DataTypes.VIRTUAL,
        /**
         * @this {import("./types/donationModel.js").DonationInstance}
         */
        get() {
          return this.donor_email || this.donor_phone || null;
        },
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        validate: {
          min: 0
        }
      }
    },
    {
      sequelize,
      modelName: "Donation",
      indexes: [
        { fields: ["recyclery_id"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    },
  );
  return Donation;
};
