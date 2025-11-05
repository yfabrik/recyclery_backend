"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class LabeledItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Category, { foreignKey: "category_id" }); //pas needed ? onpeut retrouver a pertir de subcategory
      this.belongsTo(models.Category, { foreignKey: "subcategory_id" });
      this.belongsTo(models.Store, { foreignKey: "store_id" }); //TODO store different de recyclery ?
      this.belongsTo(models.Arrival, { foreignKey: "arrival_id" });
      this.belongsTo(models.User, { foreignKey: "sold_by" });
      this.belongsTo(models.User, { foreignKey: "created_by" });
    }
  }
  LabeledItem.init(
    {
      barcode: DataTypes.STRING,
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      // category_id: DataTypes.INTEGER,//assoc
      // subcategory_id: DataTypes.INTEGER,//assoc y'a juste besoin d'une sous categorie non ?
      weight: DataTypes.DECIMAL,
      price: DataTypes.DECIMAL,
      cost: DataTypes.DECIMAL,
      condition_state: { type: DataTypes.STRING, defaultValue: "good" },
      location: DataTypes.STRING,
      // store_id: DataTypes.INTEGER, //assoc
      // arrival_id: DataTypes.INTEGER, //assoc ?
      status: { type: DataTypes.STRING, defaultValue: "available" },
      // created_by: DataTypes.INTEGER, //assoc
      sold_at: DataTypes.DATE, //assoc ???
      // sold_by: DataTypes.INTEGER, //assoc
    },
    {
      sequelize,
      modelName: "LabeledItem",
    }
  );
  return LabeledItem;
};
