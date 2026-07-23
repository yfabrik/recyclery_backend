"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("GiftCards", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      initial_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "partially_used",
          "redeemed",
          "expired",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "active",
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "EUR",
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      issued_transaction_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "SalesTransactions",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      issued_refund_transaction_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "SalesTransactions",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recipient_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      recipient_email: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex("GiftCards", ["status"]);
    await queryInterface.addIndex("GiftCards", ["expires_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("GiftCards");
  },
};
