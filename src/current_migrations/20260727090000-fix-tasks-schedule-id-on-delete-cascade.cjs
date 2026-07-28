"use strict";

/**
 * Align Task / TaskSchedule FKs with selective parent-delete rules:
 * - Tasks.schedule_id → CASCADE (schedule destroy hooks unlink past, then remove rest)
 * - Tasks.store_id → SET NULL (Recyclery hook deletes vente; nulls others)
 * - Tasks.collection_point_id → SET NULL (CollectionPoint hook deletes point; nulls others)
 * - TaskSchedules.store_id → SET NULL
 * - TaskSchedules.collection_point_id → SET NULL
 *
 * SQLite: table rebuilds so sibling FK actions are preserved.
 * MariaDB/MySQL: replace constraints only when DELETE_RULE differs.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const dialect = sequelize.getDialect();
    const isSqlite = dialect === "sqlite";
    const isMysqlFamily = ["mariadb", "mysql"].includes(dialect);

    /** @type {{ table: string, column: string, ref: string, onDelete: string }[]} */
    const jobs = [
      {
        table: "Tasks",
        column: "schedule_id",
        ref: "TaskSchedules",
        onDelete: "CASCADE",
      },
      {
        table: "Tasks",
        column: "store_id",
        ref: "Recycleries",
        onDelete: "SET NULL",
      },
      {
        table: "Tasks",
        column: "collection_point_id",
        ref: "CollectionPoints",
        onDelete: "SET NULL",
      },
      {
        table: "TaskSchedules",
        column: "store_id",
        ref: "Recycleries",
        onDelete: "SET NULL",
      },
      {
        table: "TaskSchedules",
        column: "collection_point_id",
        ref: "CollectionPoints",
        onDelete: "SET NULL",
      },
    ];

    if (isSqlite) {
      await sequelize.query("PRAGMA foreign_keys = OFF");
      try {
        const taskFks = await sequelize.query(
          "PRAGMA foreign_key_list(Tasks)",
          { type: Sequelize.QueryTypes.SELECT },
        );
        const scheduleFks = await sequelize.query(
          "PRAGMA foreign_key_list(TaskSchedules)",
          { type: Sequelize.QueryTypes.SELECT },
        );

        const needsTasksRebuild = jobs
          .filter((j) => j.table === "Tasks")
          .some((j) => {
            const row = taskFks.find((f) => f.from === j.column);
            return !row || row.on_delete !== j.onDelete;
          });
        const needsSchedulesRebuild = jobs
          .filter((j) => j.table === "TaskSchedules")
          .some((j) => {
            const row = scheduleFks.find((f) => f.from === j.column);
            return !row || row.on_delete !== j.onDelete;
          });

        if (needsTasksRebuild) {
          await rebuildSqliteTableFks(queryInterface, sequelize, "Tasks", {
            schedule_id: {
              ref: "TaskSchedules",
              allowNull: true,
              onDelete: "CASCADE",
            },
            store_id: {
              ref: "Recycleries",
              allowNull: true,
              onDelete: "SET NULL",
            },
            collection_point_id: {
              ref: "CollectionPoints",
              allowNull: true,
              onDelete: "SET NULL",
            },
          });
        }
        if (needsSchedulesRebuild) {
          await rebuildSqliteTableFks(
            queryInterface,
            sequelize,
            "TaskSchedules",
            {
              store_id: {
                ref: "Recycleries",
                allowNull: true,
                onDelete: "SET NULL",
              },
              collection_point_id: {
                ref: "CollectionPoints",
                allowNull: true,
                onDelete: "SET NULL",
              },
            },
          );
        }
      } finally {
        await sequelize.query("PRAGMA foreign_keys = ON");
      }

      await ensureIndex(queryInterface, "Tasks", ["schedule_id"]);
      await ensureIndex(queryInterface, "Tasks", ["scheduled_date"]);
      await ensureIndex(queryInterface, "Tasks", ["status"]);
      await ensureIndex(queryInterface, "TaskSchedules", ["store_id"]);
      await ensureIndex(queryInterface, "TaskSchedules", ["scheduled_date"]);
      await ensureIndex(queryInterface, "TaskSchedules", ["status"]);
      await ensureIndex(queryInterface, "TaskSchedules", ["category"]);
      return;
    }

    if (!isMysqlFamily) return;

    for (const job of jobs) {
      await replaceFk(
        queryInterface,
        sequelize,
        Sequelize,
        job.table,
        job.column,
        job.ref,
        job.onDelete,
      );
    }
  },

  async down() {
    // Irreversible: previous onDelete varied across environments.
  },
};

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} sequelize
 * @param {typeof import('sequelize')} Sequelize
 * @param {string} table
 * @param {string} column
 * @param {string} referencedTable
 * @param {string} onDelete
 */
async function replaceFk(
  queryInterface,
  sequelize,
  Sequelize,
  table,
  column,
  referencedTable,
  onDelete,
) {
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
      references: { table: referencedTable, field: "id" },
      onDelete,
      onUpdate: "CASCADE",
    });
  }
}

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
