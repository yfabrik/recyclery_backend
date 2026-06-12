"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // SQLite renameColumn recreates SalesTransactions via DROP TABLE.
    // transaction_items.transaction_id has ON DELETE CASCADE → all lines are wiped.
    await sequelize.query("PRAGMA foreign_keys = OFF");

    // const table = await queryInterface.describeTable('SalesTransactions');
    // const hasBefore = Object.prototype.hasOwnProperty.call(
    //   table,
    //   'total_amount_before_promotion',
    // );
    // const hasNet = Object.prototype.hasOwnProperty.call(table, 'total_amount');

    // if (!hasBefore && Object.prototype.hasOwnProperty.call(table, 'total_amount')) {
    await queryInterface.renameColumn(
      "SalesTransactions",
      "total_amount",
      "total_amount_before_promotion",
    );
    // }

    // if (!hasNet) {
    await queryInterface.addColumn("SalesTransactions", "total_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    // }

    // if (!Object.prototype.hasOwnProperty.call(table, 'global_promotion')) {
    // await queryInterface.addColumn('SalesTransactions', 'global_promotion', {
    //   type: Sequelize.DECIMAL(10, 2),
    //   allowNull: true,
    // });
    // }

    // if (!Object.prototype.hasOwnProperty.call(table, 'global_promotion_type')) {
    // await queryInterface.addColumn(
    //   'SalesTransactions',
    //   'global_promotion_type',
    //   {
    //     type: Sequelize.ENUM('percent', 'fixed'),
    //     allowNull: true,
    //   },
    // );
    // }
    await queryInterface.createTable("TransactionGlobalPromotions", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: Sequelize.ENUM("percent", "fixed"),
        allowNull: false,
        defaultValue: "percent",
      },
      transaction_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "SalesTransactions",
          key: "id",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
    await sequelize.query(`
      UPDATE SalesTransactions
      SET total_amount = total_amount_before_promotion
      WHERE total_amount IS NULL
         OR total_amount = 0
    `);

    await sequelize.query("PRAGMA foreign_keys = ON");
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.query("PRAGMA foreign_keys = OFF");

    // await queryInterface.removeColumn('SalesTransactions', 'global_promotion');
    // await queryInterface.removeColumn(
    //   'SalesTransactions',
    //   'global_promotion_type',
    // );
    await queryInterface.removeColumn("SalesTransactions", "total_amount");
    await queryInterface.renameColumn(
      "SalesTransactions",
      "total_amount_before_promotion",
      "total_amount",
    );
    await queryInterface.dropTable("TransactionGlobalPromotions");

    await sequelize.query("PRAGMA foreign_keys = ON");
  },
};
