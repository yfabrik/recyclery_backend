"use strict";

/**
 * Align remaining column nullability / FKs / indexes with TS models on the
 * current prod SQLite bak (and MariaDB when applicable).
 *
 * - Backfill null category_id → "Archives (orphelins)" (same as repairDbOrphans)
 * - NOT NULL / defaults for fields models require
 * - Promotions.endDate nullable (model allowNull: true)
 * - CashRegisters.recyclery_id ON DELETE CASCADE + NOT NULL
 * - LabeledItems/WasteDisposals/Arrivals/Promotions category FKs
 * - Idempotent Roles table, Categories (parent_id,name) unique, model indexes
 *
 * Does NOT create MariaDB-incompatible partial unique indexes
 * (employee_store primary uniqueness stays hook-enforced on MariaDB;
 * SQLite bak already has WHERE is_primary = 1 — left alone).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    const isSqlite = dialect === "sqlite";
    const isMysqlFamily = ["mariadb", "mysql"].includes(dialect);
    const intType = isSqlite ? Sequelize.INTEGER : Sequelize.INTEGER.UNSIGNED;

    async function ensureIndex(table, fields, { unique = false, name } = {}) {
      const indexes = await queryInterface.showIndex(table);
      const exists = indexes.some((index) => {
        if (name && index.name === name) return true;
        if (!!index.unique !== !!unique) return false;
        if ((index.fields || []).length !== fields.length) return false;
        return fields.every(
          (field, i) => index.fields[i]?.attribute === field,
        );
      });
      if (exists) return;
      await queryInterface.addIndex(table, fields, {
        unique,
        ...(name ? { name } : {}),
      });
    }

    // --- Roles (idempotent) ---
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === "string" ? t : t.tableName || t.name,
    );
    if (!tableNames.includes("Roles")) {
      await queryInterface.createTable("Roles", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: intType,
        },
        level: { type: Sequelize.STRING, allowNull: true },
        display_name: { type: Sequelize.STRING, allowNull: true },
        name: { type: Sequelize.STRING, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      });
    }

    // --- Trash category for null/dangling category_id ---
    const TRASH_NAME = "Archives (orphelins)";
    const TRASH_DESCRIPTION =
      "Catégorie technique pour rattacher des enregistrements dont la catégorie d'origine a disparu (réparation orphelins).";

    let trash = await sequelize.query(
      `SELECT id AS id FROM Categories WHERE name = :name AND parent_id IS NULL LIMIT 1`,
      {
        replacements: { name: TRASH_NAME },
        type: sequelize.QueryTypes.SELECT,
      },
    );
    if (!trash[0]?.id) {
      await sequelize.query(
        `INSERT INTO Categories
          (name, description, icon, defaultWeight, defaultPrice, IO, priceBasedOnWeight,
           bundleQuantity, bundlePrice, parent_id, createdAt, updatedAt)
         VALUES
          (:name, :description, NULL, 0, 0, 0, 0, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          replacements: { name: TRASH_NAME, description: TRASH_DESCRIPTION },
        },
      );
      trash = await sequelize.query(
        `SELECT id AS id FROM Categories WHERE name = :name AND parent_id IS NULL ORDER BY id DESC LIMIT 1`,
        {
          replacements: { name: TRASH_NAME },
          type: sequelize.QueryTypes.SELECT,
        },
      );
    }
    const trashId = trash[0]?.id;
    if (trashId == null) {
      throw new Error("failed to ensure trash category");
    }

    for (const table of ["Arrivals", "LabeledItems", "WasteDisposals"]) {
      await sequelize.query(
        `UPDATE \`${table}\`
         SET category_id = :trashId, updatedAt = CURRENT_TIMESTAMP
         WHERE category_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = category_id)`,
        { replacements: { trashId } },
      );
    }

    // Fill remaining simple defaults before NOT NULL
    await sequelize.query(`
      UPDATE Arrivals SET arrival_date = COALESCE(arrival_date, createdAt) WHERE arrival_date IS NULL
    `);
    await sequelize.query(`
      UPDATE Arrivals SET source_type = 'apport' WHERE source_type IS NULL
    `);
    await sequelize.query(`
      UPDATE Arrivals SET status = 'received' WHERE status IS NULL
    `);
    await sequelize.query(`
      UPDATE CashSessions SET status = 'open' WHERE status IS NULL
    `);
    await sequelize.query(`
      UPDATE Donations SET status = 'pending' WHERE status IS NULL
    `);
    await sequelize.query(`
      UPDATE LabeledItems SET weight = 0 WHERE weight IS NULL
    `);
    await sequelize.query(`
      UPDATE LabeledItems SET condition_state = 'good' WHERE condition_state IS NULL
    `);
    await sequelize.query(`
      UPDATE LabeledItems SET status = 'available' WHERE status IS NULL
    `);
    await sequelize.query(`
      UPDATE CashRegisters SET is_active = 1 WHERE is_active IS NULL
    `);
    await sequelize.query(`
      UPDATE Promotions SET isActive = 1 WHERE isActive IS NULL
    `);
    await sequelize.query(`
      UPDATE Categories SET defaultWeight = 0 WHERE defaultWeight IS NULL
    `);
    await sequelize.query(`
      UPDATE Categories SET defaultPrice = 0 WHERE defaultPrice IS NULL
    `);
    await sequelize.query(`
      UPDATE Categories SET IO = 0 WHERE IO IS NULL
    `);
    await sequelize.query(`
      UPDATE Categories SET priceBasedOnWeight = 0 WHERE priceBasedOnWeight IS NULL
    `);
    await sequelize.query(`
      UPDATE EcoOrganisms SET is_active = 1 WHERE is_active IS NULL
    `);
    await sequelize.query(`
      UPDATE SalesTransactions SET status = 'completed' WHERE status IS NULL
    `);

    async function assertNoNulls(table, column) {
      const rows = await sequelize.query(
        `SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` IS NULL`,
        { type: sequelize.QueryTypes.SELECT },
      );
      if (Number(rows[0].n) > 0) {
        throw new Error(
          `${table}.${column} still has ${rows[0].n} NULL row(s); refuse NOT NULL`,
        );
      }
    }

    /** @type {{ table: string, column: string, def: object }[]} */
    const nullability = [
      {
        table: "Arrivals",
        column: "arrival_date",
        def: { type: Sequelize.DATE, allowNull: false },
      },
      {
        table: "Arrivals",
        column: "source_type",
        def: {
          type: Sequelize.ENUM("point", "apport", "house_clearance"),
          allowNull: false,
        },
      },
      {
        table: "Arrivals",
        column: "status",
        def: {
          type: Sequelize.ENUM("received"),
          allowNull: false,
          defaultValue: "received",
        },
      },
      {
        table: "CashSessions",
        column: "status",
        def: {
          type: Sequelize.ENUM("open", "close"),
          allowNull: false,
          defaultValue: "open",
        },
      },
      {
        table: "Donations",
        column: "status",
        def: {
          type: Sequelize.ENUM("pending", "accepted", "rejected"),
          allowNull: false,
          defaultValue: "pending",
        },
      },
      {
        table: "Donations",
        column: "received_at",
        def: { type: Sequelize.DATE, allowNull: false },
      },
      {
        table: "CashRegisters",
        column: "is_active",
        def: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        table: "LabeledItems",
        column: "weight",
        def: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        table: "LabeledItems",
        column: "condition_state",
        def: {
          type: Sequelize.ENUM("excellent", "good", "fair", "poor"),
          allowNull: false,
          defaultValue: "good",
        },
      },
      {
        table: "LabeledItems",
        column: "status",
        def: {
          type: Sequelize.ENUM("available", "sold"),
          allowNull: false,
          defaultValue: "available",
        },
      },
      {
        table: "Promotions",
        column: "isActive",
        def: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        table: "Promotions",
        column: "endDate",
        def: { type: Sequelize.DATEONLY, allowNull: true },
      },
      {
        table: "Categories",
        column: "defaultWeight",
        def: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        table: "Categories",
        column: "defaultPrice",
        def: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        table: "Categories",
        column: "IO",
        def: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        table: "Categories",
        column: "priceBasedOnWeight",
        def: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        table: "EcoOrganisms",
        column: "is_active",
        def: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        table: "SalesTransactions",
        column: "status",
        def: {
          type: Sequelize.ENUM("pending", "completed", "cancelled"),
          allowNull: false,
          defaultValue: "completed",
        },
      },
    ];

    /** FK + allowNull alignments (models as source of truth) */
    const fkJobs = [
      {
        table: "Arrivals",
        column: "category_id",
        ref: "Categories",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "WasteDisposals",
        column: "category_id",
        ref: "Categories",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "LabeledItems",
        column: "category_id",
        ref: "Categories",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "LabeledItems",
        column: "subcategory_id",
        ref: "Categories",
        allowNull: true,
        onDelete: "RESTRICT",
      },
      {
        table: "Promotions",
        column: "category_id",
        ref: "Categories",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "CashRegisters",
        column: "recyclery_id",
        ref: "Recycleries",
        allowNull: false,
        onDelete: "CASCADE",
      },
      {
        table: "CashSessions",
        column: "cash_register_id",
        ref: "CashRegisters",
        allowNull: false,
        onDelete: "CASCADE",
      },
      {
        table: "CashSessions",
        column: "user_id",
        ref: "Users",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "Arrivals",
        column: "processed_by",
        ref: "Users",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "Donations",
        column: "received_by",
        ref: "Users",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "WasteDisposals",
        column: "created_by",
        ref: "Users",
        allowNull: false,
        onDelete: "RESTRICT",
      },
      {
        table: "SalesTransactions",
        column: "cash_session_id",
        ref: "CashSessions",
        allowNull: false,
        onDelete: "RESTRICT",
      },
    ];

    for (const { table, column, def } of nullability) {
      if (def.allowNull === false) await assertNoNulls(table, column);
    }

    if (isSqlite) {
      await sequelize.query("PRAGMA foreign_keys = OFF");
      // Sequelize SQLite changeColumn rebuilds mis-apply composite UNIQUE indexes
      // (e.g. CashRegisters (recyclery_id,name) → UNIQUE(name)). Drop them first;
      // they are recreated idempotently at the end of this migration.
      for (const table of [
        "CashRegisters",
        "Categories",
        "GiftCards",
        "Employees",
        "Arrivals",
        "CashSessions",
        "Donations",
        "LabeledItems",
        "Promotions",
        "WasteDisposals",
        "SalesTransactions",
        "EcoOrganisms",
      ]) {
        const indexes = await queryInterface.showIndex(table);
        for (const index of indexes) {
          if (!index.name || String(index.name).startsWith("sqlite_autoindex")) {
            continue;
          }
          try {
            await queryInterface.removeIndex(table, index.name);
          } catch {
            // index may already be gone after a prior rebuild
          }
        }
      }
    }
    try {
      for (const { table, column, def } of nullability) {
        await queryInterface.changeColumn(table, column, def);
      }

      for (const job of fkJobs) {
        if (job.allowNull === false) await assertNoNulls(job.table, job.column);
      }

      if (isSqlite) {
        // One rebuild per table so sibling ON DELETE actions are not stripped by
        // sequential changeColumn rebuilds.
        await rebuildSqliteTableFks(queryInterface, sequelize, "CashRegisters", {
          recyclery_id: {
            ref: "Recycleries",
            allowNull: false,
            onDelete: "CASCADE",
          },
        });
        await rebuildSqliteTableFks(queryInterface, sequelize, "CashSessions", {
          cash_register_id: {
            ref: "CashRegisters",
            allowNull: false,
            onDelete: "CASCADE",
          },
          user_id: { ref: "Users", allowNull: false, onDelete: "RESTRICT" },
        });
        await rebuildSqliteTableFks(queryInterface, sequelize, "Arrivals", {
          category_id: {
            ref: "Categories",
            allowNull: false,
            onDelete: "RESTRICT",
          },
          subcategory_id: {
            ref: "Categories",
            allowNull: true,
            onDelete: "RESTRICT",
          },
          collection_point_id: {
            ref: "CollectionPoints",
            allowNull: true,
            onDelete: "RESTRICT",
          },
          processed_by: {
            ref: "Users",
            allowNull: false,
            onDelete: "RESTRICT",
          },
        });
        await rebuildSqliteTableFks(queryInterface, sequelize, "Donations", {
          received_by: {
            ref: "Users",
            allowNull: false,
            onDelete: "RESTRICT",
          },
        });
        await rebuildSqliteTableFks(
          queryInterface,
          sequelize,
          "WasteDisposals",
          {
            category_id: {
              ref: "Categories",
              allowNull: false,
              onDelete: "RESTRICT",
            },
            subcategory_id: {
              ref: "Categories",
              allowNull: true,
              onDelete: "RESTRICT",
            },
            created_by: {
              ref: "Users",
              allowNull: false,
              onDelete: "RESTRICT",
            },
          },
        );
        await rebuildSqliteTableFks(queryInterface, sequelize, "LabeledItems", {
          category_id: {
            ref: "Categories",
            allowNull: false,
            onDelete: "RESTRICT",
          },
          subcategory_id: {
            ref: "Categories",
            allowNull: true,
            onDelete: "RESTRICT",
          },
          created_by: {
            ref: "Users",
            allowNull: true,
            onDelete: "SET NULL",
          },
        });
        await rebuildSqliteTableFks(queryInterface, sequelize, "Promotions", {
          category_id: {
            ref: "Categories",
            allowNull: false,
            onDelete: "RESTRICT",
          },
        });
        await rebuildSqliteTableFks(
          queryInterface,
          sequelize,
          "SalesTransactions",
          {
            cash_session_id: {
              ref: "CashSessions",
              allowNull: false,
              onDelete: "RESTRICT",
            },
            created_by: {
              ref: "Users",
              allowNull: true,
              onDelete: "SET NULL",
            },
          },
        );
      } else if (isMysqlFamily) {
        for (const job of fkJobs) {
          await queryInterface.changeColumn(job.table, job.column, {
            type: intType,
            allowNull: job.allowNull,
          });

          const constraints = await sequelize.query(
            `SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS deleteRule
             FROM information_schema.KEY_COLUMN_USAGE k
             JOIN information_schema.REFERENTIAL_CONSTRAINTS r
               ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
              AND k.TABLE_SCHEMA = r.CONSTRAINT_SCHEMA
             WHERE k.TABLE_SCHEMA = DATABASE()
               AND k.TABLE_NAME = :table
               AND k.COLUMN_NAME = :column
               AND k.REFERENCED_TABLE_NAME = :ref`,
            {
              replacements: {
                table: job.table,
                column: job.column,
                ref: job.ref,
              },
              type: sequelize.QueryTypes.SELECT,
            },
          );

          for (const row of constraints) {
            if (row.deleteRule === job.onDelete) continue;
            await queryInterface.removeConstraint(job.table, row.name);
            await queryInterface.addConstraint(job.table, {
              fields: [job.column],
              type: "foreign key",
              name: row.name,
              references: { table: job.ref, field: "id" },
              onDelete: job.onDelete,
              onUpdate: "CASCADE",
            });
          }

          if (constraints.length === 0) {
            await queryInterface.addConstraint(job.table, {
              fields: [job.column],
              type: "foreign key",
              name: `fk_${job.table.toLowerCase()}_${job.column}`,
              references: { table: job.ref, field: "id" },
              onDelete: job.onDelete,
              onUpdate: "CASCADE",
            });
          }
        }
      }
    } finally {
      if (isSqlite) {
        await sequelize.query("PRAGMA foreign_keys = ON");
      }
    }

    // --- Indexes (idempotent; full unique only, no partial WHERE) ---
    await ensureIndex("Categories", ["parent_id"], {
      name: "categories_parent_id",
    });
    await ensureIndex("Categories", ["parent_id", "name"], {
      unique: true,
      name: "categories_parent_id_name",
    });
    await ensureIndex("EcoOrganisms", ["is_active"], {
      name: "eco_organisms_is_active",
    });
    await ensureIndex("Arrivals", ["category_id"]);
    await ensureIndex("Arrivals", ["status"]);
    await ensureIndex("Arrivals", ["createdAt"]);
    await ensureIndex("CashSessions", ["cash_register_id"]);
    await ensureIndex("CashSessions", ["user_id", "status"]);
    await ensureIndex("CashSessions", ["status"]);
    await ensureIndex("CashSessions", ["createdAt"]);
    await ensureIndex("Donations", ["recyclery_id"]);
    await ensureIndex("Donations", ["status"]);
    await ensureIndex("Donations", ["createdAt"]);
    await ensureIndex("WasteDisposals", ["disposal_date"]);
    await ensureIndex("WasteDisposals", ["category_id"]);
    await ensureIndex("WasteDisposals", ["eco_organism_id"]);
    await ensureIndex("LabeledItems", ["status"]);
    await ensureIndex("LabeledItems", ["recyclery_id"]);
    await ensureIndex("LabeledItems", ["category_id"]);
    await ensureIndex("Promotions", ["category_id"]);
    await ensureIndex("Promotions", ["startDate", "endDate"]);
    await ensureIndex("CashRegisters", ["recyclery_id"]);
    await ensureIndex("CashRegisters", ["recyclery_id", "name"], {
      unique: true,
      name: "cash_registers_recyclery_id_name",
    });
  },

  async down() {
    // Irreversible data backfills + constraint tightening.
  },
};

/**
 * Rebuild a SQLite table once, applying FK allowNull/onDelete overrides.
 * Preserves all columns from describeTable (after prior changeColumns).
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string} table
 * @param {Record<string, { ref: string, allowNull: boolean, onDelete: string, onUpdate?: string }>} fkOverrides
 */
async function rebuildSqliteTableFks(
  queryInterface,
  sequelize,
  table,
  fkOverrides,
) {
  const desc = await queryInterface.describeTable(table);
  const colNames = Object.keys(desc);
  const parts = [];
  const pks = colNames.filter((name) => desc[name].primaryKey);

  for (const name of colNames) {
    const d = desc[name];
    const fk = fkOverrides[name];
    const allowNull = fk ? fk.allowNull : d.allowNull;
    let type = d.type || "TEXT";
    // Keep INTEGER PK autoincrement idiom
    if (d.primaryKey && pks.length === 1 && /INT/i.test(type)) {
      parts.push(`\`${name}\` INTEGER PRIMARY KEY AUTOINCREMENT`);
      continue;
    }
    let sql = `\`${name}\` ${type}`;
    if (!allowNull) sql += " NOT NULL";
    if (
      d.defaultValue !== undefined &&
      d.defaultValue !== null &&
      !d.primaryKey
    ) {
      const def = d.defaultValue;
      if (typeof def === "boolean") sql += ` DEFAULT ${def ? 1 : 0}`;
      else if (typeof def === "number") sql += ` DEFAULT ${def}`;
      else sql += ` DEFAULT ${sequelize.escape(String(def))}`;
    }
    if (fk) {
      sql += ` REFERENCES \`${fk.ref}\` (\`id\`) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate || "CASCADE"}`;
    }
    parts.push(sql);
  }

  if (pks.length > 1) {
    parts.push(`PRIMARY KEY (${pks.map((p) => `\`${p}\``).join(", ")})`);
  }

  const tmp = `\`${table}__fkfix\``;
  const qTable = `\`${table}\``;
  await sequelize.query(
    `CREATE TABLE ${tmp} (${parts.join(", ")})`,
  );
  const cols = colNames.map((c) => `\`${c}\``).join(", ");
  await sequelize.query(
    `INSERT INTO ${tmp} (${cols}) SELECT ${cols} FROM ${qTable}`,
  );
  await sequelize.query(`DROP TABLE ${qTable}`);
  await sequelize.query(`ALTER TABLE ${tmp} RENAME TO ${qTable}`);
}

