"use strict";
import createHttpError from "http-errors";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Recyclery extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.hasMany(models.LabeledItem, { foreignKey: "recyclery_id" });
      this.hasMany(models.Donation, { foreignKey: "recyclery_id" });
      this.hasMany(models.CollectionSchedule, { foreignKey: "recyclery_id" });
      this.hasMany(models.StoreHours, {
        foreignKey: "store_id",
        as: "horaires",
        onDelete: "CASCADE" 
      });

      this.belongsToMany(models.User, {
        through: "EmployeeStore",
        foreignKey: "store_id",
        as: "employees",
      });

      this.belongsTo(models.User, {
        foreignKey: "manager_id",
        as: "manager",
      });
      this.hasMany(models.CashRegister, {
        foreignKey: "recyclery_id",
        as: "caisses",
        onDelete: "CASCADE" //TODO le cash register est censé refuser de se delete si ya une caisse ouverte, estce que le cascade empeche le delete du store aussi ou faut un truc en +
      });
    }
  }
  Recyclery.init(
    {
      name: { type: DataTypes.STRING, allowNull: false },
      address: DataTypes.TEXT,
      phone: DataTypes.STRING,
      email: DataTypes.STRING,
      city: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "Recyclery",
      hooks: {
        beforeDestroy: async (recyclery) => {
          // Get all cash registers for this recyclery
          const CashRegister = recyclery.sequelize.models.CashRegister;
          if (CashRegister) {
            const caisses = await recyclery.getCaisses();
            
            // Check each cash register for open sessions
            for (const caisse of caisses) {
              const openSessions = await caisse.countSessions({ 
                where: { status: "open" } 
              });
              
              if (openSessions > 0) {
                throw new createHttpError[424](
                  `Impossible de supprimer la recyclerie car la caisse "${caisse.name}" a des sessions ouvertes`
                );
              }
            }
          }
        },
      },
    }
  );
  return Recyclery;
};
