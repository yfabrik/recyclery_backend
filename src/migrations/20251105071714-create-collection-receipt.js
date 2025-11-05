'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CollectionReceipts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      schedule_id: {
        type: Sequelize.INTEGER
      },
      receipt_number: {
        type: Sequelize.STRING
      },
      collection_date: {
        type: Sequelize.DATE
      },
      collector_name: {
        type: Sequelize.STRING
      },
      collection_point_name: {
        type: Sequelize.STRING
      },
      collection_point_address: {
        type: Sequelize.TEXT
      },
      items_collected: {
        type: Sequelize.TEXT
      },
      total_weight: {
        type: Sequelize.DECIMAL
      },
      notes: {
        type: Sequelize.TEXT
      },
      signature_data: {
        type: Sequelize.TEXT
      },
      status: {
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
    await queryInterface.dropTable('CollectionReceipts');
  }
};