'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CollectionSchedules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      collection_point_id: {
        type: Sequelize.INTEGER
      },
      scheduled_date: {
        type: Sequelize.DATE
      },
      scheduled_time: {
        type: Sequelize.TIME
      },
      employee_id: {
        type: Sequelize.INTEGER
      },
      vehicle: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      estimated_duration: {
        type: Sequelize.INTEGER
      },
      notes: {
        type: Sequelize.TEXT
      },
      receipt_number: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('CollectionSchedules');
  }
};