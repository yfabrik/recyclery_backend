"use strict";

/**
 * Align EmployeeWorkdays.employee_id with MariaDB:
 * NOT NULL + REFERENCES Employees(id) ON DELETE CASCADE ON UPDATE CASCADE.
 *
 * SQLite bak drifted to nullable + NO ACTION after the day_of_week rebuild,
 * and accumulated NULL employee_id rows. Those rows are deleted before the
 * table rebuild. MariaDB/MySQL: no-op.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== "sqlite") return;

    const desc = await queryInterface.describeTable("EmployeeWorkdays");
    const fks = await sequelize.query(
      "PRAGMA foreign_key_list(EmployeeWorkdays)",
      { type: Sequelize.QueryTypes.SELECT },
    );
    const empFk = fks.find((f) => f.from === "employee_id");
    const alreadyAligned =
      desc.employee_id &&
      desc.employee_id.allowNull === false &&
      empFk &&
      String(empFk.on_delete).toUpperCase() === "CASCADE";

    if (!alreadyAligned) {
      await sequelize.query("PRAGMA foreign_keys = OFF");
      try {
        await sequelize.query(`
          DELETE FROM EmployeeWorkdays
          WHERE employee_id IS NULL
             OR employee_id NOT IN (SELECT id FROM Employees)
        `);
        await rebuildSqliteTableFks(
          queryInterface,
          sequelize,
          "EmployeeWorkdays",
          {
            employee_id: {
              ref: "Employees",
              allowNull: false,
              onDelete: "CASCADE",
              onUpdate: "CASCADE",
            },
          },
        );
      } finally {
        await sequelize.query("PRAGMA foreign_keys = ON");
      }
    }

    await ensureIndex(queryInterface, "EmployeeWorkdays", ["employee_id"]);
    await ensureIndex(
      queryInterface,
      "EmployeeWorkdays",
      ["employee_id", "day_of_week"],
      { name: "employee_workdays_employee_id_day_of_week" },
    );
  },

  async down() {
    // Irreversible: previous onDelete/nullability varied.
  },
};

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} table
 * @param {string[]} fields
 * @param {{ name?: string, unique?: boolean }} [opts]
 */
async function ensureIndex(queryInterface, table, fields, opts = {}) {
  const indexes = await queryInterface.showIndex(table);
  const exists = indexes.some((index) => {
    if (opts.name && index.name === opts.name) return true;
    if (!!index.unique !== !!opts.unique) return false;
    if ((index.fields || []).length !== fields.length) return false;
    return fields.every((field, i) => index.fields[i]?.attribute === field);
  });
  if (!exists) {
    await queryInterface.addIndex(table, fields, opts);
  }
}

/**
 * Rebuild a SQLite table once, applying FK allowNull/onDelete overrides.
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
