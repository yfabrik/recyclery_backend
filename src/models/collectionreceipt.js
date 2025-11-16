"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class CollectionReceipt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.CollectionSchedule, { foreignKey: "schedule_id" });
    }
  }
  CollectionReceipt.init(
    {
      // schedule_id: DataTypes.INTEGER,//assoc
      receipt_number: DataTypes.STRING, //id ? assoc ?
      // collection_date: DataTypes.DATE,//c'est dans collection schedule 
      // collector_name: DataTypes.STRING,
      // collection_point_name: DataTypes.STRING,
      // collection_point_address: DataTypes.TEXT,
      items_collected: DataTypes.TEXT,
      total_weight: DataTypes.DECIMAL,
      notes: DataTypes.TEXT,
      signature_data: DataTypes.TEXT,
      status: { type: DataTypes.STRING, defaultValue: "draft" },
    },
    {
      sequelize,
      modelName: "CollectionReceipt",
    }
  );
  return CollectionReceipt;
};
