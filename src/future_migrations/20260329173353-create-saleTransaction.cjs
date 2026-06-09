"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SalesTransactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      payment_method: {
        type: Sequelize.ENUM("cash", "card", "check"),
      },
      transactionType: {
        type: Sequelize.ENUM("sell", "refund"),
        defaultValue: "sell",
      },
      payment_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      // customer_name: {
      //   type: Sequelize.STRING,
      // },
      // customer_email: {
      //   type: Sequelize.STRING,
      // },
      customer_postal_code: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM("pending", "completed", "cancelled"),
        defaultValue: "completed",
      },
      cash_session_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "CashSessions",
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
    await queryInterface.dropTable("SalesTransactions");
  },
};
