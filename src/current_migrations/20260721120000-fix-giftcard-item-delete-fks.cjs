"use strict";

/**
 * Align GiftCards.issued_* FKs to ON DELETE CASCADE.
 * Align transaction_items.labeled_item_id to ON DELETE RESTRICT.
 * Align Arrivals.collection_point_id to ON DELETE RESTRICT.
 *
 * Works on SQLite (prod bak) and MariaDB/MySQL.
 * SQLite: GiftCards + transaction_items use table rebuild (changeColumn
 * corrupts composite PK / drops sibling FK actions).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    const isSqlite = dialect === "sqlite";
    const isMysqlFamily = ["mariadb", "mysql"].includes(dialect);

    if (isSqlite) {
      await sequelize.query("PRAGMA foreign_keys = OFF");
      try {
        // Arrivals.collection_point_id — single-column FK, changeColumn is fine
        await queryInterface.changeColumn("Arrivals", "collection_point_id", {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "CollectionPoints", key: "id" },
          onDelete: "RESTRICT",
          onUpdate: "CASCADE",
        });

        await rebuildGiftCards(sequelize);
        await rebuildTransactionItems(sequelize);
      } finally {
        await sequelize.query("PRAGMA foreign_keys = ON");
      }
      return;
    }

    if (!isMysqlFamily) return;

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

/** @param {import('sequelize').Sequelize} sequelize */
async function rebuildGiftCards(sequelize) {
  const fks = await sequelize.query("PRAGMA foreign_key_list(GiftCards)", {
    type: sequelize.QueryTypes.SELECT,
  });
  const issued = fks.find((f) => f.from === "issued_transaction_id");
  const refund = fks.find((f) => f.from === "issued_refund_transaction_id");
  if (issued?.on_delete === "CASCADE" && refund?.on_delete === "CASCADE") {
    return;
  }

  await sequelize.query(`
    CREATE TABLE \`GiftCards__new\` (
      \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
      \`code\` VARCHAR(255) NOT NULL UNIQUE,
      \`initial_value\` DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`expires_at\` DATETIME,
      \`status\` TEXT NOT NULL DEFAULT 'active',
      \`currency\` VARCHAR(3) NOT NULL DEFAULT 'EUR',
      \`issued_at\` DATETIME NOT NULL,
      \`issued_transaction_id\` INTEGER REFERENCES \`SalesTransactions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      \`issued_refund_transaction_id\` INTEGER REFERENCES \`SalesTransactions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      \`created_by\` INTEGER REFERENCES \`Users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      \`note\` TEXT,
      \`recipient_name\` VARCHAR(255),
      \`recipient_email\` VARCHAR(255),
      \`createdAt\` DATETIME NOT NULL,
      \`updatedAt\` DATETIME NOT NULL
    )
  `);
  await sequelize.query(`
    INSERT INTO \`GiftCards__new\` (
      id, code, initial_value, expires_at, status, currency, issued_at,
      issued_transaction_id, issued_refund_transaction_id, created_by,
      note, recipient_name, recipient_email, createdAt, updatedAt
    )
    SELECT
      id, code, initial_value, expires_at, status, currency, issued_at,
      issued_transaction_id, issued_refund_transaction_id, created_by,
      note, recipient_name, recipient_email, createdAt, updatedAt
    FROM \`GiftCards\`
  `);
  await sequelize.query("DROP TABLE `GiftCards`");
  await sequelize.query("ALTER TABLE `GiftCards__new` RENAME TO `GiftCards`");
  await sequelize.query(
    "CREATE INDEX IF NOT EXISTS `gift_cards_status` ON `GiftCards` (`status`)",
  );
  await sequelize.query(
    "CREATE INDEX IF NOT EXISTS `gift_cards_expires_at` ON `GiftCards` (`expires_at`)",
  );
  await sequelize.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS `gift_cards_code` ON `GiftCards` (`code`)",
  );
}

/** @param {import('sequelize').Sequelize} sequelize */
async function rebuildTransactionItems(sequelize) {
  const fks = await sequelize.query(
    "PRAGMA foreign_key_list(`transaction_items`)",
    { type: sequelize.QueryTypes.SELECT },
  );
  const labeled = fks.find((f) => f.from === "labeled_item_id");
  if (labeled?.on_delete === "RESTRICT") return;

  await sequelize.query(`
    CREATE TABLE \`transaction_items__new\` (
      \`name\` VARCHAR(255),
      \`price\` DECIMAL,
      \`quantity\` INTEGER,
      \`promotionValue\` DECIMAL(5,2) NOT NULL DEFAULT 0,
      \`bundleQuantity\` INTEGER,
      \`bundlePrice\` DECIMAL(10,2),
      \`createdAt\` DATETIME NOT NULL,
      \`updatedAt\` DATETIME NOT NULL,
      \`labeled_item_id\` INTEGER NOT NULL REFERENCES \`LabeledItems\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      \`transaction_id\` INTEGER NOT NULL REFERENCES \`SalesTransactions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      PRIMARY KEY (\`labeled_item_id\`, \`transaction_id\`)
    )
  `);
  await sequelize.query(`
    INSERT INTO \`transaction_items__new\` (
      name, price, quantity, promotionValue, bundleQuantity, bundlePrice,
      createdAt, updatedAt, labeled_item_id, transaction_id
    )
    SELECT
      name, price, quantity, promotionValue, bundleQuantity, bundlePrice,
      createdAt, updatedAt, labeled_item_id, transaction_id
    FROM \`transaction_items\`
  `);
  await sequelize.query("DROP TABLE `transaction_items`");
  await sequelize.query(
    "ALTER TABLE `transaction_items__new` RENAME TO `transaction_items`",
  );
}
