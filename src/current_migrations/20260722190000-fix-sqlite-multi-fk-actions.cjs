"use strict";

/**
 * Follow-up for DBs that already ran 20260722180000 before multi-FK SQLite
 * rebuilds: sequential changeColumn left sibling ON DELETE as NO ACTION.
 * Idempotent on fresh runs (rebuilds again with correct actions).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() !== "sqlite") return;

    const { sequelize } = queryInterface;
    await sequelize.query("PRAGMA foreign_keys = OFF");
    try {
      await rebuild(queryInterface, sequelize, "CashRegisters", {
        recyclery_id: {
          ref: "Recycleries",
          allowNull: false,
          onDelete: "CASCADE",
        },
      });
      await rebuild(queryInterface, sequelize, "CashSessions", {
        cash_register_id: {
          ref: "CashRegisters",
          allowNull: false,
          onDelete: "CASCADE",
        },
        user_id: { ref: "Users", allowNull: false, onDelete: "RESTRICT" },
      });
      await rebuild(queryInterface, sequelize, "Arrivals", {
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
        processed_by: { ref: "Users", allowNull: false, onDelete: "RESTRICT" },
      });
      await rebuild(queryInterface, sequelize, "Donations", {
        received_by: { ref: "Users", allowNull: false, onDelete: "RESTRICT" },
      });
      await rebuild(queryInterface, sequelize, "WasteDisposals", {
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
        created_by: { ref: "Users", allowNull: false, onDelete: "RESTRICT" },
      });
      await rebuild(queryInterface, sequelize, "LabeledItems", {
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
        created_by: { ref: "Users", allowNull: true, onDelete: "SET NULL" },
      });
      await rebuild(queryInterface, sequelize, "Promotions", {
        category_id: {
          ref: "Categories",
          allowNull: false,
          onDelete: "RESTRICT",
        },
      });
      await rebuild(queryInterface, sequelize, "SalesTransactions", {
        cash_session_id: {
          ref: "CashSessions",
          allowNull: false,
          onDelete: "RESTRICT",
        },
        created_by: { ref: "Users", allowNull: true, onDelete: "SET NULL" },
      });
    } finally {
      await sequelize.query("PRAGMA foreign_keys = ON");
    }

    // Recreate indexes dropped by rebuilds
    const ensure = async (table, fields, opts = {}) => {
      const indexes = await queryInterface.showIndex(table);
      const exists = indexes.some((index) => {
        if (opts.name && index.name === opts.name) return true;
        if (!!index.unique !== !!opts.unique) return false;
        if ((index.fields || []).length !== fields.length) return false;
        return fields.every(
          (field, i) => index.fields[i]?.attribute === field,
        );
      });
      if (!exists) {
        await queryInterface.addIndex(table, fields, opts);
      }
    };

    await ensure("Categories", ["parent_id"], { name: "categories_parent_id" });
    await ensure("Categories", ["parent_id", "name"], {
      unique: true,
      name: "categories_parent_id_name",
    });
    await ensure("CashRegisters", ["recyclery_id"]);
    await ensure("CashRegisters", ["recyclery_id", "name"], {
      unique: true,
      name: "cash_registers_recyclery_id_name",
    });
    await ensure("Arrivals", ["category_id"]);
    await ensure("Arrivals", ["status"]);
    await ensure("Arrivals", ["createdAt"]);
    await ensure("CashSessions", ["cash_register_id"]);
    await ensure("CashSessions", ["user_id", "status"]);
    await ensure("CashSessions", ["status"]);
    await ensure("CashSessions", ["createdAt"]);
    await ensure("Donations", ["recyclery_id"]);
    await ensure("Donations", ["status"]);
    await ensure("Donations", ["createdAt"]);
    await ensure("WasteDisposals", ["disposal_date"]);
    await ensure("WasteDisposals", ["category_id"]);
    await ensure("WasteDisposals", ["eco_organism_id"]);
    await ensure("LabeledItems", ["status"]);
    await ensure("LabeledItems", ["recyclery_id"]);
    await ensure("LabeledItems", ["category_id"]);
    await ensure("Promotions", ["category_id"]);
    await ensure("Promotions", ["startDate", "endDate"]);
    await ensure("SalesTransactions", ["cash_session_id"]);
    await ensure("SalesTransactions", ["createdAt"]);
    await ensure("SalesTransactions", ["status"]);
  },

  async down() {},
};

async function rebuild(queryInterface, sequelize, table, fkOverrides) {
  const desc = await queryInterface.describeTable(table);
  const colNames = Object.keys(desc);
  const parts = [];
  const pks = colNames.filter((name) => desc[name].primaryKey);

  for (const name of colNames) {
    const d = desc[name];
    const fk = fkOverrides[name];
    const allowNull = fk ? fk.allowNull : d.allowNull;
    const type = d.type || "TEXT";
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
  await sequelize.query(`CREATE TABLE ${tmp} (${parts.join(", ")})`);
  const cols = colNames.map((c) => `\`${c}\``).join(", ");
  await sequelize.query(
    `INSERT INTO ${tmp} (${cols}) SELECT ${cols} FROM ${qTable}`,
  );
  await sequelize.query(`DROP TABLE ${qTable}`);
  await sequelize.query(`ALTER TABLE ${tmp} RENAME TO ${qTable}`);
}
