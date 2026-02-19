"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Arrival extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "categorie",
      });

      //pas needed just get 1 and find the parent
      this.belongsTo(models.Category, {
        foreignKey: "subcategory_id",
        as: "subcategorie",
      });
      this.belongsTo(models.CollectionPoint, {
        foreignKey: "collection_point_id",
      });

      this.belongsTo(models.User, { foreignKey: "processed_by" });
    }
  }

  // TODO arrival + collection + collection point + collection receipt + collection schedule C'EST UN BLOCK
  // leurs status evolue
  Arrival.init(
    {
      // arrival_number: DataTypes.STRING,// id ?
      // category_id: DataTypes.INTEGER,//assoc
      // subcategory_id: DataTypes.INTEGER,//assoc
      /** les infos sont dans collection receipt */
      weight: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      arrival_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, //TODO dateonly or merge with arrival time ?// createdAt
      arrival_time: DataTypes.TIME,
      source_type: {
        type: DataTypes.ENUM("point", "apport", "house_clearance"),
      }, //source table ?
      source_details: DataTypes.TEXT,
      // collection_point_id: DataTypes.INTEGER,//assoc ?
      // collection_point_name: DataTypes.STRING,//dans la table collection point ?
      // collection_point_address: DataTypes.TEXT,//pareil ?
      // volunteer_donation: DataTypes.BOOLEAN,
      // house_clearance: DataTypes.BOOLEAN,
      notes: DataTypes.TEXT,
      // processed_by: DataTypes.INTEGER, //assoc
      status: { type: DataTypes.ENUM("received"), defaultValue: "received" }, //TODO ??? what are the types
    },
    {
      sequelize,
      modelName: "Arrival",
      indexes: [
        { fields: ["category_id"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    },
  );
  return Arrival;
};
