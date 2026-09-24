"use strict";

const {
  createEmployeeTaskTimeRangeTable,
  dropEmployeeTaskTimeRangeTable,
  backfillEmployeeTaskTimeRanges,
} = require("../migration_helpers/employeeTaskTimeRange.cjs");

/**
 * MariaDB. Backfills because the already-migrated database holds employee_task
 * rows; a fresh empty database backfills nothing. At cutover the SQLite
 * migration runs first and migrateToMariadb replaces this backfill with the
 * SQLite ranges. Mirrors current_migrations/20260924100000-create-employee-task-time-range.cjs.
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
