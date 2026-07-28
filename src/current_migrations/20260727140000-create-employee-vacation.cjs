"use strict";

/**
 * Create EmployeeVacations (employee leave / absence periods).
 * Idempotent for bak smoke re-runs.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    const isSqlite = dialect === "sqlite";
    const intType = isSqlite ? Sequelize.INTEGER : Sequelize.INTEGER.UNSIGNED;

    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === "string" ? t : t.tableName || t.name,
    );
    if (tableNames.includes("EmployeeVacations")) return;

    await queryInterface.createTable("EmployeeVacations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: intType,
      },
      reason: {
        type: Sequelize.ENUM("paid_vacation", "sick", "other"),
        allowNull: false,
        defaultValue: "other",
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      employee_id: {
        type: intType,
        allowNull: false,
        references: {
          model: "Employees",
          key: "id",
        },
        onDelete: "CASCADE",
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

    await queryInterface.addIndex("EmployeeVacations", ["employee_id"]);
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === "string" ? t : t.tableName || t.name,
    );
    if (!tableNames.includes("EmployeeVacations")) return;
    await queryInterface.dropTable("EmployeeVacations");
  },
};
