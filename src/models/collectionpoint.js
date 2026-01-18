"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CollectionPoint extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      // this.hasMany(models.CollectionSchedule, {
      //   foreignKey: "collection_point_id",
      // });
      this.hasMany(models.TaskSchedule, { onDelete: "CASCADE" })//FIXME need to trigger hook to delete futur tasks ?
      this.hasMany(models.Task)
      this.hasMany(models.Arrival, { foreignKey: "collection_point_id" })
    }
  }
  CollectionPoint.init(
    {
      name: { type: DataTypes.STRING, unique: true },
      address: DataTypes.TEXT,
      city: DataTypes.STRING,
      postal_code: { type: DataTypes.STRING, validate: { is: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/ } },
      contact_person: { type: DataTypes.STRING, validate: { isAlphanumeric: true } },
      contact_phone: { type: DataTypes.STRING, validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },allowNull:true },
      contact_email: { type: DataTypes.STRING, validate: { isEmail: true },allowNull:true },
      type: { type: DataTypes.ENUM("standard", "entreprise", "association", "school", "hospital", "other"), defaultValue: "standard" },
      notes: DataTypes.TEXT,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CollectionPoint",
      hooks: {

      }
    }
  );
  return CollectionPoint;
};
