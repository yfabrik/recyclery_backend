"use strict";

/**
 * Align GiftCards.issued_* FKs to ON DELETE CASCADE (sale delete removes unused issued cards).
 * Align transaction_items.labeled_item_id to ON DELETE RESTRICT.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (!["mariadb", "mysql"].includes(dialect)) return;

    const { sequelize } = queryInterface;

    async function replaceFk(table, column, referencedTable, onDelete) {
      const constraints = await sequelize.query(
        `SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS deleteRule
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
          AND k.TABLE_SCHEMA = r.CONSTRAINT_SCHEMA
         WHERE k.TABLE_SCHEMA = DATABASE()
           AND k.TABLE_NAME = :table
           AND k.COLUMN_NAME = :column
           AND k.REFERENCED_TABLE_NAME = :referencedTable`,
        {
          replacements: { table, column, referencedTable },
          type: sequelize.QueryTypes.SELECT,
        },
      );

      for (const row of constraints) {
        if (row.deleteRule === onDelete) continue;
        await queryInterface.removeConstraint(table, row.name);
        await queryInterface.addConstraint(table, {
          fields: [column],
          type: "foreign key",
          name: row.name,
          references: { table: referencedTable, field: "id" },
          onDelete,
          onUpdate: "CASCADE",
        });
      }
    }

    await replaceFk(
      "GiftCards",
      "issued_transaction_id",
      "SalesTransactions",
      "CASCADE",
    );
    await replaceFk(
      "GiftCards",
      "issued_refund_transaction_id",
      "SalesTransactions",
      "CASCADE",
    );
    await replaceFk(
      "transaction_items",
      "labeled_item_id",
      "LabeledItems",
      "RESTRICT",
    );
    await replaceFk(
      "Arrivals",
      "collection_point_id",
      "CollectionPoints",
      "RESTRICT",
    );
  },

  async down() {
    // Irreversible
  },
};
