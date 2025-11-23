'use strict';
import { Model } from 'sequelize';
/**
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
    class Task extends Model {
        /**
             *@param {models} models
             */
        static associate(models) {
            this.belongsTo(models.Recyclery, { foreignKey: "store_id" })
        }
    }
    Task.init({
        name: DataTypes.STRING,
        description: DataTypes.STRING,
        address: DataTypes.TEXT,
        city: DataTypes.STRING,
        postal_code: DataTypes.STRING,
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
        sequelize,
        modelName: 'StoreLocation',
    });
    return Task;
};