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
      // this.hasMany(models.CollectionSchedule, { foreignKey: "recyclery_id" });
      // this.hasMany(models.StoreHours, {
      //   foreignKey: "store_id",
      //   as: "horaires",
      //   onDelete: "CASCADE"
      // });
      this.hasMany(models.Task, { onDelete: "CASCADE" }); //ouverture boutique + ?
      this.hasMany(models.TaskSchedule, { onDelete: "CASCADE" });

      // this.belongsToMany(models.User, {
      //   through: "EmployeeStore",
      //   foreignKey: "store_id",
      //   as: "employees",
      // });
      this.belongsToMany(models.Employee, {
        through: models.EmployeeStore,
        as: "employees",
      });

      this.belongsTo(models.User, {
        foreignKey: "manager_id",
        as: "manager",
      });
      this.hasMany(models.CashRegister, {
        foreignKey: "recyclery_id",
        as: "caisses",
        onDelete: "CASCADE", //TODO le cash register est censé refuser de se delete si ya une caisse ouverte, estce que le cascade empeche le delete du store aussi ou faut un truc en +
      });
    }
  }

  Recyclery.init(
    {
      name: { type: DataTypes.STRING, allowNull: false },
      address: DataTypes.TEXT,
      phone: {
        type: DataTypes.STRING,
        validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
      },
      email: { type: DataTypes.STRING, validate: { isEmail: true } },
      city: DataTypes.STRING,
      postal_code: {
        type: DataTypes.STRING,
        validate: { is: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/ },
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "Recyclery",
      indexes: [
        { fields: ["is_active"] },
        { fields: ["manager_id"] },
      ],
      hooks: {
        beforeDestroy: async (recyclery) => {
          // Get all cash registers for this recyclery
          const CashRegister = recyclery.sequelize.models.CashRegister;
          if (CashRegister) {
            const caisses = await recyclery.getCaisses();

            // Check each cash register for open sessions
            for (const caisse of caisses) {
              const openSessions = await caisse.countSessions({
                where: { status: "open" },
              });

              if (openSessions > 0) {
                throw new createHttpError[424](
                  `Impossible de supprimer la recyclerie car la caisse "${caisse.name}" a des sessions ouvertes`,
                );
              }
            }
          }
        },
      },
    },
  );
  return Recyclery;
};
