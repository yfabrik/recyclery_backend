"use strict";

/**
 * Align user FKs after restore from bak (SQLite prod + MariaDB):
 * - giftcard_transactions.created_by (add if missing)
 * - nullable created_by + ON DELETE SET NULL for sales/items/gift cards
 * - ON DELETE RESTRICT + NOT NULL for donations/arrivals/cash sessions/waste
 * - Recycleries.manager_id stays ON DELETE SET NULL
 *
 * Backfills (SQLite/MariaDB):
 * - Donations.received_at ← createdAt when null
 * - CashSessions.user_id ← peer user on same cash_register when null
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    const isSqlite = dialect === "sqlite";
    const isMysqlFamily = ["mariadb", "mysql"].includes(dialect);

    const giftTx = await queryInterface.describeTable("giftcard_transactions");
    if (!Object.prototype.hasOwnProperty.call(giftTx, "created_by")) {
      await queryInterface.addColumn("giftcard_transactions", "created_by", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    await sequelize.query(`
      UPDATE Donations
      SET received_at = createdAt
      WHERE received_at IS NULL
    `);

    // Peer remap for CashSessions.user_id (same idea as repairDbOrphans)
    const nullSessions = await sequelize.query(
      `SELECT id, cash_register_id FROM CashSessions WHERE user_id IS NULL`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    for (const session of nullSessions) {
      const peers = await sequelize.query(
        `SELECT user_id AS user_id, COUNT(*) AS cnt
         FROM CashSessions
         WHERE cash_register_id = :reg
           AND user_id IS NOT NULL
         GROUP BY user_id
         ORDER BY cnt DESC, user_id ASC
         LIMIT 1`,
        {
          replacements: { reg: session.cash_register_id },
           type: Sequelize.QueryTypes.SELECT ,
        },
      );
      if (!peers[0]?.user_id) {
        throw new Error(
          `CashSessions.id=${session.id}: cannot backfill user_id (no peer on register ${session.cash_register_id})`,
        );
      }
      await sequelize.query(
        `UPDATE CashSessions SET user_id = :uid WHERE id = :id`,
        { replacements: { uid: peers[0].user_id, id: session.id } },
      );
    }

    const intType = Sequelize.INTEGER.UNSIGNED;

    /** @type {{ table: string, column: string, allowNull: boolean, onDelete: string }[]} */
    const userFks = [
      {
        table: "LabeledItems",
        column: "created_by",
        allowNull: true,
        onDelete: "SET NULL",
      },
      {
        table: "SalesTransactions",
        column: "created_by",
        allowNull: true,
        onDelete: "SET NULL",
      },
      {
        table: "GiftCards",
        column: "created_by",
        allowNull: true,
        onDelete: "SET NULL",
      },
      {
        table: "giftcard_transactions",
        column: "created_by",
        allowNull: true,
        onDelete: "SET NULL",
      },
      {
        table: "Donations",
        column: "received_by",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "WasteDisposals",
        column: "created_by",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "Arrivals",
        column: "processed_by",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "CashSessions",
        column: "user_id",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "Recycleries",
        column: "manager_id",
        allowNull: true,
        onDelete: "SET NULL",
      },
    ];

    if (isSqlite) {
      await sequelize.query("PRAGMA foreign_keys = OFF");
      try {
        for (const { table, column, allowNull, onDelete } of userFks) {
          const desc = await queryInterface.describeTable(table);
          if (!Object.prototype.hasOwnProperty.call(desc, column)) continue;
          await queryInterface.changeColumn(table, column, {
            type: Sequelize.INTEGER,
            allowNull,
            references: { model: "Users", key: "id" },
            onDelete,
            onUpdate: "CASCADE",
          });
        }
      } finally {
        await sequelize.query("PRAGMA foreign_keys = ON");
      }
      return;
    }

    if (!isMysqlFamily) return;

    for (const { table, column, allowNull } of userFks) {
      const desc = await queryInterface.describeTable(table);
      if (!Object.prototype.hasOwnProperty.call(desc, column)) continue;
      await queryInterface.changeColumn(table, column, {
        type: intType,
        allowNull,
      });
    }

    for (const { table, column, onDelete } of userFks) {
      const constraints = await sequelize.query(
        `SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS deleteRule
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
          AND k.TABLE_SCHEMA = r.CONSTRAINT_SCHEMA
         WHERE k.TABLE_SCHEMA = DATABASE()
           AND k.TABLE_NAME = :table
           AND k.COLUMN_NAME = :column
           AND k.REFERENCED_TABLE_NAME = 'Users'`,
        {
          replacements: { table, column },
          type: Sequelize.QueryTypes.SELECT,
        },
      );

      for (const row of constraints) {
        if (row.deleteRule === onDelete) continue;
        await queryInterface.removeConstraint(table, row.name);
        await queryInterface.addConstraint(table, {
          fields: [column],
          type: "foreign key",
          name: row.name,
          references: { table: "Users", field: "id" },
          onDelete,
          onUpdate: "CASCADE",
        });
      }

      if (constraints.length === 0) {
        await queryInterface.addConstraint(table, {
          fields: [column],
          type: "foreign key",
          name: `fk_${table.toLowerCase()}_${column}_users`,
          references: { table: "Users", field: "id" },
          onDelete,
          onUpdate: "CASCADE",
        });
      }
    }
  },

  async down() {
    // Irreversible: previous onDelete / nullability varied across environments.
  },
};
