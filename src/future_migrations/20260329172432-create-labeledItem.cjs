"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LabeledItems", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      description: {
        type: Sequelize.TEXT,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
      },
      condition_state: {
        type: Sequelize.ENUM("excellent", "good", "fair", "poor"),
        defaultValue: "good",
      },
      status: {
        type: Sequelize.ENUM("available", "sold"),
        defaultValue: "available",
      },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Categories",
          key: "id",
        },
      },
      subcategory_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Categories",
          key: "id",
        },
      },
      recyclery_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Recycleries",
          key: "id",
        },
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Users",
          key: "id",
        },
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
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("LabeledItems");
  },
};
