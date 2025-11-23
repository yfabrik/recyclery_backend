"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CollectionSchedule extends Model {
/**
     *@param {models} models
     */
    static associate(models) {
      this.belongsTo(models.CollectionPoint, { foreignKey: "collection_point_id" });
      this.belongsToMany(models.User, { foreignKey: "schedule_id",through:"user_schedule" });
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.hasOne(models.CollectionReceipt, { foreignKey: "schedule_id" })
    }
  }

  //TODO DOUBLON avec Collection
  CollectionSchedule.init(
    {
      // collection_point_id: DataTypes.INTEGER, //assoc
      scheduled_date: DataTypes.DATE,
      scheduled_time: DataTypes.TIME,
      // employee_id: DataTypes.INTEGER, //assoc
      vehicle: DataTypes.STRING,
      status: { type: DataTypes.STRING, defaultValue: "planned" },
      estimated_duration: DataTypes.INTEGER,
      notes: DataTypes.TEXT,

      //si jamais c'est pas dans un point collect defini
      address: DataTypes.TEXT,
      contact_name: DataTypes.STRING,
      contact_phone: DataTypes.STRING,
      
      // receipt_number: DataTypes.STRING, //assoc ?
    },
    {
      sequelize,
      modelName: "CollectionSchedule",
    }
  );
  return CollectionSchedule;
};
