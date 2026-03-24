/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(
        "ALTER TYPE \"enum_SalesTransactions_payment_method\" ADD VALUE IF NOT EXISTS 'giftcard';",
      );
    }
  },

  async down() {
    // Intentionally left empty:
    // removing enum values in postgres requires full type recreation and data migration.
  },
};
