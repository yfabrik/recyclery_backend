"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Arrivals", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      arrival_number: {
        type: Sequelize.STRING,
      },
      category_id: {
        type: Sequelize.INTEGER,
      },
      subcategory_id: {
        type: Sequelize.INTEGER,
      },
      weight: {
        type: Sequelize.DECIMAL,
      },
      arrival_date: {
        type: Sequelize.DATE,
      },
      arrival_time: {
        type: Sequelize.TIME,
      },
      source_type: {
        type: Sequelize.STRING,
      },
      source_details: {
        type: Sequelize.TEXT,
      },
      collection_point_id: {
        type: Sequelize.INTEGER,
      },
      collection_point_name: {
        type: Sequelize.STRING,
      },
      collection_point_address: {
        type: Sequelize.TEXT,
      },
      volunteer_donation: {
        type: Sequelize.BOOLEAN,
      },
      house_clearance: {
        type: Sequelize.BOOLEAN,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      processed_by: {
        type: Sequelize.INTEGER,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Arrivals");
  },
};
