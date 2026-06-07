"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transaction_items", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesTransactions",
          key: "id",
        },
      },
      labeled_item_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "LabeledItems",
          key: "id",
        },
      },
      name: {
        type: Sequelize.STRING,
      },

      price: {
        type: Sequelize.DECIMAL(10, 2),
      },
      quantity: {
        type: Sequelize.INTEGER,
      },
      promotionValue: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      bundleQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bundlePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
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
    await queryInterface.dropTable("transaction_items");
  },
};
