'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // 1. Get LabeledItems with transaction_id and build name as "category.name > subcategory.name"
    const [rawRows] = await sequelize.query(
      `SELECT li.id,
        CASE
          WHEN cat.name IS NOT NULL AND sub.name IS NOT NULL THEN cat.name || ' > ' || sub.name
          WHEN cat.name IS NOT NULL THEN cat.name
          WHEN sub.name IS NOT NULL THEN sub.name
          ELSE ''
        END AS name,
        li.price,
        li.transaction_id
       FROM "LabeledItems" li
       LEFT JOIN "Categories" cat ON li.category_id = cat.id
       LEFT JOIN "Categories" sub ON li.subcategory_id = sub.id
       WHERE li.transaction_id IS NOT NULL`
    );

    const labeledItems = /** @type {Array<{ id: number, name: string, price: number, transaction_id: number }>} */ (Array.isArray(rawRows) ? rawRows : []);

    if (labeledItems.length === 0) {
      await removeTransactionIdColumnIfExists(queryInterface, sequelize);
      return;
    }

    const now = new Date();
    const dialect = sequelize.getDialect();
    const isoNow = now.toISOString();

    // 2. Insert into transaction_items using raw SQL (avoids bulkInsert rollback if a later step fails)
    for (const item of labeledItems) {
      const name = item.name != null ? String(item.name).slice(0, 255) : '';
      if (dialect === 'sqlite') {
        await sequelize.query(
          `INSERT INTO transaction_items (transaction_id, labeled_item_id, name, price, quantity, total_price, promotionValue, bundleQuantity, bundlePrice, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 1, ?, 0, NULL, NULL, ?, ?)`,
          {
            replacements: [item.transaction_id, item.id, name, item.price, item.price, isoNow, isoNow],
          }
        );
      } else {
        await sequelize.query(
          `INSERT INTO transaction_items (transaction_id, labeled_item_id, name, price, quantity, total_price, "promotionValue", "bundleQuantity", "bundlePrice", "createdAt", "updatedAt")
           VALUES (:transaction_id, :labeled_item_id, :name, :price, 1, :total_price, 0, NULL, NULL, :createdAt, :updatedAt)`,
          {
            replacements: {
              transaction_id: item.transaction_id,
              labeled_item_id: item.id,
              name,
              price: item.price,
              total_price: item.price,
              createdAt: isoNow,
              updatedAt: isoNow,
            },
          }
        );
      }
    }

    // 3. Remove transaction_id column from LabeledItems only if it exists (avoid rollback)
    await removeTransactionIdColumnIfExists(queryInterface, sequelize);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // Re-add transaction_id column to LabeledItems
    await queryInterface.addColumn('LabeledItems', 'transaction_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Optionally repopulate: set LabeledItems.transaction_id from transaction_items where quantity=1 and labeled_item_id matches
    await sequelize.query(
      `UPDATE "LabeledItems" SET transaction_id = (
        SELECT transaction_id FROM transaction_items
        WHERE transaction_items.labeled_item_id = "LabeledItems".id
        AND transaction_items.quantity = 1
        LIMIT 1
      ) WHERE id IN (
        SELECT labeled_item_id FROM transaction_items WHERE quantity = 1
      )`
    );
  },
};

/**
 * Remove transaction_id from LabeledItems only if the column exists. Drops FK constraint first if present.
 * Avoids throwing so the migration transaction is not rolled back (which would undo the transaction_items inserts).
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} sequelize
 */
async function removeTransactionIdColumnIfExists(queryInterface, sequelize) {
  const tableName = 'LabeledItems';
  const columnName = 'transaction_id';

  const tableDesc = await queryInterface.describeTable(tableName);
  if (!tableDesc || !Object.prototype.hasOwnProperty.call(tableDesc, columnName)) {
    return;
  }

  const constraintName = `fk_${tableName.toLowerCase()}_${columnName}`;
  try {
    await queryInterface.removeConstraint(tableName, constraintName);
  } catch (_) {
    // No FK or different name
  }

  await queryInterface.removeColumn(tableName, columnName);
}
