"use strict";
import { Model } from "sequelize";
/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Task extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      this.belongsTo(models.TaskSchedule, { foreignKey: "schedule_id" });
      this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      this.belongsTo(models.CollectionPoint, {
        foreignKey: "collection_point_id",
      });
      this.belongsToMany(models.Employee, { through: "employee_task" });
    }
  }
  Task.init(
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      category: {
        type: DataTypes.ENUM("vente", "point", "collection", "custom"),
        allowNull: false,
      },
      priority: DataTypes.STRING,
      // estimated_duration: DataTypes.INTEGER,
      required_skills: DataTypes.TEXT,
      location: DataTypes.STRING,
      equipment_needed: DataTypes.TEXT,
      hourly_rate: DataTypes.DECIMAL,
      scheduled_date: DataTypes.DATE,
      day_of_week: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.scheduled_date) return null;
          const d = new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
          }).format(this.scheduled_date);
          return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
        },
      },
      start_time: DataTypes.DATE,
      end_time: DataTypes.DATE,

      notes: DataTypes.TEXT,
      status: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Task",
      indexes: [
        { fields: ["schedule_id"] },
        { fields: ["scheduled_date"] },
        { fields: ["status"] },
      ],
    },
  );
  return Task;
};
