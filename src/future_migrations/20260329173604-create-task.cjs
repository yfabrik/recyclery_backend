"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Tasks", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      schedule_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "TaskSchedules",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      store_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Recycleries",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      collection_point_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "CollectionPoints",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
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
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex("Tasks", ["schedule_id"]);
    await queryInterface.addIndex("Tasks", ["scheduled_date"]);
    await queryInterface.addIndex("Tasks", ["status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Tasks");
  },
};
