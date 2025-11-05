'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Arrival extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Category, { foreignKey: "category_id" });
      this.belongsTo(models.Category, { foreignKey: "subcategory_id" });
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
      arrival_number: DataTypes.STRING,
      // category_id: DataTypes.INTEGER,//assoc
      // subcategory_id: DataTypes.INTEGER,//assoc
      /** les infos sont dans collection receipt */
      weight: DataTypes.DECIMAL,
      arrival_date: DataTypes.DATE, //datetime exists ?
      arrival_time: DataTypes.TIME,
      source_type: DataTypes.STRING, //source table ?
      source_details: DataTypes.TEXT,
      // collection_point_id: DataTypes.INTEGER,//assoc ?
      // collection_point_name: DataTypes.STRING,//dans la table collection point ?
      // collection_point_address: DataTypes.TEXT,//pareil ?
      volunteer_donation: DataTypes.BOOLEAN,
      house_clearance: DataTypes.BOOLEAN,
      notes: DataTypes.TEXT,
      // processed_by: DataTypes.INTEGER, //assoc
      status: { type: DataTypes.STRING, defaultValue: "received" },
    },
    {
      sequelize,
      modelName: "Arrival",
    }
  );
  return Arrival;
};
