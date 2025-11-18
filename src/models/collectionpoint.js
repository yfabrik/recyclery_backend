"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CollectionPoint extends Model {
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
      this.hasMany(models.CollectionSchedule, {
        foreignKey: "collection_point_id",
      });
      this.hasMany(models.Arrival, { foreignKey: "collection_point_id" })
    }
  }
  CollectionPoint.init(
    {
      name: DataTypes.STRING,
      address: DataTypes.TEXT,
      city: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      contact_person: DataTypes.STRING,
      contact_phone: DataTypes.STRING,
      contact_email: DataTypes.STRING,
      type: { type: DataTypes.STRING, defaultValue: "standard" },
      notes: DataTypes.TEXT,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CollectionPoint",
    }
  );
  return CollectionPoint;
};
