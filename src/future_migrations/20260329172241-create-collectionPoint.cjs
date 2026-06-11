"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CollectionPoints", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
      },
      city: {
        type: Sequelize.STRING,
      },
      postal_code: {
        type: Sequelize.STRING,
      },
      contact_person: {
        type: Sequelize.STRING,
      },
      contact_phone: {
        type: Sequelize.STRING,
      },
      contact_email: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.ENUM(
          "standard",
          "entreprise",
          "association",
          "school",
          "hospital",
          "other",
        ),
        defaultValue: "standard",
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      recyclery_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Recycleries",
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

  async down(queryInterface) {
    await queryInterface.dropTable("CollectionPoints");
  },
};
