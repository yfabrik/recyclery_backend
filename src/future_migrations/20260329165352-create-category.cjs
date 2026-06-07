"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Categories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      icon: {
        type: Sequelize.STRING,
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "Categories",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      defaultWeight: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      defaultPrice: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      IO: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      priceBasedOnWeight: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      bundleQuantity: {
        type: Sequelize.INTEGER,
      },
      bundlePrice: {
        type: Sequelize.DECIMAL(10, 2),
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
    await queryInterface.dropTable("Categories");
  },
};
