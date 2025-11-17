'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StoreHours', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      day_of_week: {
        type: Sequelize.STRING
      },
      time_slot_name: {
        type: Sequelize.STRING
      },
      is_open: {
        type: Sequelize.BOOLEAN
      },
      open_time: {
        type: Sequelize.TIME
      },
      close_time: {
        type: Sequelize.TIME
      },
      is_24h: {
        type: Sequelize.BOOLEAN
      },
      notes: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('StoreHours');
  }
};