"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex("employee_store");
    const brokenIndex = indexes.find(
      (index) => index.name === "employee_store_unique_primary_per_employee",
    );

    if (!brokenIndex) return;

    // MariaDB/MySQL ignore partial-index WHERE clauses and enforce uniqueness
    // on employeeId alone, blocking multiple store assignments per employee.
    await queryInterface.removeIndex(
      "employee_store",
      "employee_store_unique_primary_per_employee",
    );
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "sqlite") return;

    await queryInterface.addIndex("employee_store", ["employeeId"], {
      unique: true,
      name: "employee_store_unique_primary_per_employee",
      where: { is_primary: true },
    });
  },
};
