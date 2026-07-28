"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("TaskSchedules", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      store_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Recycleries",
          key: "id",
        },
        // Selective cleanup in Recyclery.beforeDestroy (vente delete, others null).
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      collection_point_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "CollectionPoints",
          key: "id",
        },
        // Selective cleanup in CollectionPoint.beforeDestroy (point delete, others null).
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      recurrence_pattern: {
        type: Sequelize.ENUM("daily", "weekly", "monthly"),
      },
      name: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
      category: {
        type: Sequelize.ENUM("vente", "point", "collection", "custom"),
        allowNull: false,
      },
      priority: {
        type: Sequelize.STRING,
      },
      required_skills: {
        type: Sequelize.TEXT,
      },
      location: {
        type: Sequelize.STRING,
      },
      equipment_needed: {
        type: Sequelize.TEXT,
      },
      hourly_rate: {
        type: Sequelize.DECIMAL,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("TaskSchedules", ["store_id"]);
    await queryInterface.addIndex("TaskSchedules", ["scheduled_date"]);
    await queryInterface.addIndex("TaskSchedules", ["status"]);
    await queryInterface.addIndex("TaskSchedules", ["category"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("TaskSchedules");
  },
};
