"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Categories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
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
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
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
        allowNull: false,
      },
      defaultPrice: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      IO: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      priceBasedOnWeight: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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

    // Full unique index (not partial). MariaDB allows multiple NULLs in parent_id,
    // same as Sequelize — do not use WHERE clauses here (ignored on MariaDB).
    await queryInterface.addIndex("Categories", ["parent_id"]);
    await queryInterface.addIndex("Categories", ["parent_id", "name"], {
      unique: true,
      name: "categories_parent_id_name",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Categories");
  },
};
