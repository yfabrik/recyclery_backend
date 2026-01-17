"use strict";
import { Model, Op } from "sequelize";
import logger from "../services/logger.js";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
    class TaskTemplate extends Model {
        /**
         *@param {import ('./types/models.js').models} models
         */
        static associate(models) {
        }
    }

    // receipt_number: DataTypes.STRING, //assoc ?
    TaskTemplate.init(
        {
            name: DataTypes.STRING,
            description: DataTypes.TEXT,
            category: { type: DataTypes.ENUM("vente", "point", "collection", "custom"), allowNull: false },
            scheduled_date: DataTypes.DATE,
            start_time: DataTypes.TIME,
            end_time: DataTypes.TIME,
            priority: DataTypes.STRING,
            status: DataTypes.STRING,


            notes: DataTypes.TEXT,

            hourly_rate: DataTypes.DECIMAL,
            required_skills: DataTypes.TEXT,
            location: DataTypes.STRING,
            equipment_needed: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: "TaskTemplate",
        }
    )
    return TaskTemplate;
};
