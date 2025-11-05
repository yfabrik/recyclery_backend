'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CollectionPoint extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
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
      // recyclery_id: DataTypes.INTEGER//assoc
    },
    {
      sequelize,
      modelName: "CollectionPoint",
    }
  );
  return CollectionPoint;
};
