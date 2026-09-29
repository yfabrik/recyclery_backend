"use strict";

const {
  createEmployeeTaskTimeRangeTable,
  dropEmployeeTaskTimeRangeTable,
  backfillEmployeeTaskTimeRanges,
} = require("../migration_helpers/employeeTaskTimeRange.cjs");

/**
 * SQLite (production). employee_task is created by Sequelize sync(), not by a
 * migration of this chain, so the helper fails clearly if it is missing.
 * Mirrors future_migrations/20260924100000-create-employee-task-time-range.cjs.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);
    await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize);
  },

  async down(queryInterface) {
    await dropEmployeeTaskTimeRangeTable(queryInterface);
  },
};
