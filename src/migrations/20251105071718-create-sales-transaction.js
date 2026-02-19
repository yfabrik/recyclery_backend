"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SalesTransactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      transaction_number: {
        type: Sequelize.STRING,
      },
      cash_session_id: {
        type: Sequelize.INTEGER,
      },
      store_id: {
        type: Sequelize.INTEGER,
      },
      total_amount: {
        type: Sequelize.DECIMAL,
      },
      payment_method: {
        type: Sequelize.STRING,
      },
      payment_amount: {
        type: Sequelize.DECIMAL,
      },
      change_amount: {
        type: Sequelize.DECIMAL,
      },
      customer_name: {
        type: Sequelize.STRING,
      },
      customer_email: {
        type: Sequelize.STRING,
      },
      customer_postal_code: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      refunded_amount: {
        type: Sequelize.DECIMAL,
      },
      created_by: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable("SalesTransactions");
  },
};
