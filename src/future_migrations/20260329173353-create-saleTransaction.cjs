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
      transactionId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "SalesTransactions",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      total_amount_before_promotion: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM(
          "cash",
          "card",
          "check",
          "giftcard",
          "mixed",
          "transfer",
        ),
        allowNull: false,
      },
      transactionType: {
        type: Sequelize.ENUM("sell", "refund"),
        defaultValue: "sell",
        allowNull: false,
      },
      payment_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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
        type: Sequelize.ENUM("pending", "completed", "cancelled"),
        defaultValue: "completed",
        allowNull: false,
      },
      cash_session_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "CashSessions",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
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

    await queryInterface.addIndex("SalesTransactions", ["cash_session_id"]);
    await queryInterface.addIndex("SalesTransactions", ["createdAt"]);
    await queryInterface.addIndex("SalesTransactions", ["status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("SalesTransactions");
  },
};
