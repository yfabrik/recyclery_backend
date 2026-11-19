"use strict";

/**
 * Index `transaction_items.transaction_id`.
 *
 * The SQLite `transaction_items` has PRIMARY KEY (labeled_item_id,
 * transaction_id), the reverse of the model's and MariaDB's (transaction_id,
 * labeled_item_id). It already had it in the 2026-06-23 production backup,
 * before this chain touched the table (20260721120000-fix-giftcard-item-delete-fks
 * rebuilds it with the key it finds). So no index can find a transaction's
 * lines: each sales analytics query (the "has lines" check of a Sale, the
 * lines join) scanned the whole table once per transaction, ~6 s for a year,
 * and the Suivi des Ventes page ran past the front's 10 s request timeout.
 * No row is changed: the data was never wrong, only slow to reach.
 *
 * Adds nothing where an index already starts with `transaction_id`
 * (MariaDB's primary key), so `future_migrations` needs no twin.
 *
 * @type {import('sequelize-cli').Migration}
 */

const TABLE = "transaction_items";
const INDEX = "transaction_items_transaction_id";

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex(TABLE);
    const leadsWithTransactionId = indexes.some(
      (index) => index.fields?.[0]?.attribute === "transaction_id",
    );
    if (leadsWithTransactionId) return;
    await queryInterface.addIndex(TABLE, ["transaction_id"], { name: INDEX });
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex(TABLE);
    if (indexes.some((index) => index.name === INDEX)) {
      await queryInterface.removeIndex(TABLE, INDEX);
    }
  },
};
