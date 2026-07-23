"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CashSessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      cash_register_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "CashRegisters",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      opening_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      closing_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      expected_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      status: {
        type: Sequelize.ENUM("open", "close"),
        defaultValue: "open",
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      closed_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("CashSessions", ["cash_register_id"]);
    await queryInterface.addIndex("CashSessions", ["user_id", "status"]);
    await queryInterface.addIndex("CashSessions", ["status"]);
    await queryInterface.addIndex("CashSessions", ["createdAt"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("CashSessions");
  },
};
