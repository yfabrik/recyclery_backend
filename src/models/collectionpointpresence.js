"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CollectionPointPresence extends Model {
    /**
     *@param {models} models
     */
    static associate(models) {
      this.belongsTo(models.CollectionPoint, {
        foreignKey: "collection_point_id",
      });
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
    }
  }
  CollectionPointPresence.init(
    {
      day_of_week: DataTypes.STRING,
      time_slot_name: DataTypes.STRING,
      is_present: DataTypes.BOOLEAN,
      start_time: DataTypes.TIME,
      end_time: DataTypes.TIME,
      is_24h: DataTypes.BOOLEAN,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "CollectionPointPresence",
    }
  );
  return CollectionPointPresence;
};
