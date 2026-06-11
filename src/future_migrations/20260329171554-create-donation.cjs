"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Donations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      donor_name: {
        type: Sequelize.STRING,
      },
      donor_phone: {
        type: Sequelize.STRING,
      },
      donor_email: {
        type: Sequelize.STRING,
      },
      item_description: {
        type: Sequelize.TEXT,
      },
      estimated_value: {
        type: Sequelize.DECIMAL(10, 2),
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "accepted", "rejected"),
        defaultValue: "pending",
        allowNull: false,
      },
      recyclery_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Recycleries",
          key: "id",
        },
      },
      received_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Users",
          key: "id",
        },
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Donations");
  },
};
