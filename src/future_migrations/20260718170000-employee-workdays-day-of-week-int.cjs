"use strict";

/**
 * Map EmployeeWorkdays.day_of_week from English STRING → INTEGER 0–6 (Sun=0).
 * No data loss: aborts if any value cannot be mapped.
 *
 * MariaDB connector v3 + Sequelize 6: untyped raw SELECTs and
 * queryInterface.removeColumn() throw:
 *   TypeError: Cannot delete property 'meta' of [object Array]
 * because sequelize/lib/dialects/mariadb/query.js does `delete data.meta`
 * on a non-configurable `meta` from the connector. Fixed below with
 * QueryTypes.SELECT and raw ALTER … DROP COLUMN. Sequelize v7 supports
 * mariadb@3 properly; until then avoid removeColumn / untyped SELECT.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "EmployeeWorkdays";
    const desc = await queryInterface.describeTable(table);

    // Resume after partial run: day_of_week dropped, day_of_week_int still present
    if (!desc.day_of_week && desc.day_of_week_int) {
      await queryInterface.renameColumn(table, "day_of_week_int", "day_of_week");
      try {
        await queryInterface.changeColumn(table, "day_of_week", {
          type: Sequelize.INTEGER,
          allowNull: false,
        });
      } catch {
        // SQLite may no-op
      }
      return;
    }

    if (!desc.day_of_week) {
      throw new Error(`${table}.day_of_week missing`);
    }
    // Already migrated (integer / number type)
    const type = String(desc.day_of_week.type || "").toUpperCase();
    if (
      type.includes("INT") &&
      !type.includes("CHAR") &&
      !type.includes("TEXT") &&
      !type.includes("VARCHAR")
    ) {
      return;
    }

    if (!desc.day_of_week_int) {
      await queryInterface.addColumn(table, "day_of_week_int", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE EmployeeWorkdays SET day_of_week_int = CASE LOWER(TRIM(day_of_week))
        WHEN 'sunday' THEN 0
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        ELSE NULL
      END
    `);

    // Broken on mariadb@3 + Sequelize 6 (untyped query → formatResults delete data.meta):
    // const [rows] = await queryInterface.sequelize.query(`
    //   SELECT id, day_of_week FROM EmployeeWorkdays
    //   WHERE day_of_week_int IS NULL
    // `);
    const rows = await queryInterface.sequelize.query(
      `
      SELECT id, day_of_week FROM EmployeeWorkdays
      WHERE day_of_week_int IS NULL
    `,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const sample = rows
        .slice(0, 10)
        .map((r) => `#${r.id}=${JSON.stringify(r.day_of_week)}`)
        .join(", ");
      throw new Error(
        `Cannot map EmployeeWorkdays.day_of_week for ${rows.length} row(s). Fix data then re-run. Sample: ${sample}`,
      );
    }

    // Broken on mariadb@3 + Sequelize 6 (removeColumn runs SHOW/KEY queries as raw):
    // await queryInterface.removeColumn(table, "day_of_week");
    {
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === "sqlite") {
        const indexes = await queryInterface.showIndex(table);
        for (const index of indexes) {
          const fields = (index.fields || []).map(
            (f) => f.attribute || f.name || f,
          );
          if (fields.includes("day_of_week") && index.name) {
            await queryInterface.removeIndex(table, index.name);
          }
        }
      }
      const q = (name) => queryInterface.quoteIdentifier(name);
      await queryInterface.sequelize.query(
        `ALTER TABLE ${q(table)} DROP COLUMN ${q("day_of_week")}`,
      );
    }
    await queryInterface.renameColumn(table, "day_of_week_int", "day_of_week");

    // Enforce NOT NULL where dialect supports changeColumn
    try {
      await queryInterface.changeColumn(table, "day_of_week", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    } catch {
      // SQLite may no-op or recreate; values are already non-null
    }

    // Recreate common composite index after SQLite drop
    if (queryInterface.sequelize.getDialect() === "sqlite") {
      try {
        await queryInterface.addIndex(table, ["employee_id", "day_of_week"], {
          name: "employee_workdays_employee_id_day_of_week",
        });
      } catch {
        // already exists
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const table = "EmployeeWorkdays";
    const desc = await queryInterface.describeTable(table);
    if (!desc.day_of_week) return;

    const type = String(desc.day_of_week.type || "").toUpperCase();
    if (type.includes("CHAR") || type.includes("TEXT") || type.includes("VARCHAR")) {
      return;
    }

    await queryInterface.addColumn(table, "day_of_week_str", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE EmployeeWorkdays SET day_of_week_str = CASE day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
        ELSE NULL
      END
    `);

    // Broken on mariadb@3 + Sequelize 6 (same delete data.meta issue):
    // const [rows] = await queryInterface.sequelize.query(`
    //   SELECT id FROM EmployeeWorkdays WHERE day_of_week_str IS NULL
    // `);
    const rows = await queryInterface.sequelize.query(
      `SELECT id FROM EmployeeWorkdays WHERE day_of_week_str IS NULL`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (Array.isArray(rows) && rows.length > 0) {
      throw new Error(
        `Cannot reverse-map day_of_week for ${rows.length} row(s)`,
      );
    }

    // Broken on mariadb@3 + Sequelize 6:
    // await queryInterface.removeColumn(table, "day_of_week");
    {
      const q = (name) => queryInterface.quoteIdentifier(name);
      await queryInterface.sequelize.query(
        `ALTER TABLE ${q(table)} DROP COLUMN ${q("day_of_week")}`,
      );
    }
    await queryInterface.renameColumn(table, "day_of_week_str", "day_of_week");

    try {
      await queryInterface.changeColumn(table, "day_of_week", {
        type: Sequelize.STRING,
        allowNull: false,
      });
    } catch {
      // ignore
    }
  },
};
