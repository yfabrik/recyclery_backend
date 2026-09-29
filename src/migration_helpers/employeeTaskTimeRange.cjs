"use strict";

/**
 * Shared by the `create-employee-task-time-range` migration of both chains
 * (current_migrations = SQLite, future_migrations = MariaDB). Lives outside the
 * migrations folders because sequelize-cli runs every file found there.
 *
 * Rationale: docs/adr/0001-time-ranges-in-a-separate-table.md
 */

const TABLE = "employee_task_time_range";
const TIME_ZONE = "Europe/Paris";

const parisClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Datetimes are stored as UTC (no timezone override in the Sequelize config):
 * SQLite as text "YYYY-MM-DD HH:MM:SS.mmm +00:00", MariaDB as a DATETIME that the
 * driver hands back as a Date. Text without an offset is UTC as well.
 * @param {unknown} value
 * @returns {Date}
 */
function parseStoredInstant(value) {
  let date = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string") {
    const match = value
      .trim()
      .match(
        /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)\s*(Z|[+-]\d{2}:?\d{2})?$/,
      );
    if (match) {
      const [, day, time, zone] = match;
      const offset = !zone || zone === "Z" ? "Z" : zone.replace(/^([+-]\d{2})(\d{2})$/, "$1:$2");
      date = new Date(`${day}T${time.length === 5 ? `${time}:00` : time}${offset}`);
    }
  }
  if (date === null || Number.isNaN(date.getTime())) {
    throw new Error(`Not a datetime: ${String(value)}`);
  }
  return date;
}

/**
 * Wall-clock time of day in Europe/Paris, "HH:MM:00". Seconds are dropped, like
 * `toMinutes` (getHours/getMinutes) does when the app runs under TZ=Europe/Paris.
 * @param {unknown} value
 * @returns {string}
 */
function parisTimeOfDay(value) {
  const parts = parisClock.formatToParts(parseStoredInstant(value));
  const hour = parts.find((p) => p.type === "hour").value;
  const minute = parts.find((p) => p.type === "minute").value;
  return `${hour}:${minute}:00`;
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function assertEmployeeTaskExists(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : t.tableName));
  if (!names.includes("employee_task")) {
    throw new Error(
      "Table employee_task is missing. It is created by Sequelize sync() on the SQLite " +
        "production database and by 20260329174140-create-employee-task in future_migrations; " +
        `${TABLE} cannot reference it.`,
    );
  }
}

/**
 * Creates the table with its composite FK to employee_task inline (SQLite cannot
 * add it afterwards).
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {typeof import('sequelize')} Sequelize
 */
async function createEmployeeTaskTimeRangeTable(queryInterface, Sequelize) {
  await assertEmployeeTaskExists(queryInterface);
  const { sequelize } = queryInterface;
  const dialect = sequelize.getDialect();

  if (dialect === "sqlite") {
    await sequelize.query(`
      CREATE TABLE \`${TABLE}\` (
        \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
        \`EmployeeId\` INTEGER NOT NULL,
        \`TaskId\` INTEGER NOT NULL,
        \`start_time\` TIME NOT NULL,
        \`end_time\` TIME NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        CHECK (\`start_time\` < \`end_time\`),
        FOREIGN KEY (\`EmployeeId\`, \`TaskId\`)
          REFERENCES \`employee_task\` (\`EmployeeId\`, \`TaskId\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  } else if (["mariadb", "mysql"].includes(dialect)) {
    await sequelize.query(`
      CREATE TABLE \`${TABLE}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`EmployeeId\` INT UNSIGNED NOT NULL,
        \`TaskId\` INT UNSIGNED NOT NULL,
        \`start_time\` TIME NOT NULL,
        \`end_time\` TIME NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`${TABLE}_start_before_end\` CHECK (\`start_time\` < \`end_time\`),
        CONSTRAINT \`${TABLE}_employee_task_fk\`
          FOREIGN KEY (\`EmployeeId\`, \`TaskId\`)
          REFERENCES \`employee_task\` (\`EmployeeId\`, \`TaskId\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  } else {
    throw new Error(`Unsupported dialect for ${TABLE}: ${dialect}`);
  }

  await queryInterface.addIndex(TABLE, ["EmployeeId", "TaskId"]);
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function dropEmployeeTaskTimeRangeTable(queryInterface) {
  await queryInterface.dropTable(TABLE);
}

/**
 * Gives every employee_task row that has no range yet one range covering its
 * Task's whole time of day in Europe/Paris. Done in JS on purpose: SQL time
 * functions would return the UTC time of day, one or two hours off.
 * Rows whose Task is gone are left alone (nothing to copy from).
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {typeof import('sequelize')} Sequelize
 * @returns {Promise<number>} number of ranges inserted
 */
async function backfillEmployeeTaskTimeRanges(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const pending = await sequelize.query(
    `SELECT et.EmployeeId AS EmployeeId, et.TaskId AS TaskId,
            t.start_time AS start_time, t.end_time AS end_time
     FROM employee_task et
     JOIN Tasks t ON t.id = et.TaskId
     LEFT JOIN ${TABLE} r ON r.EmployeeId = et.EmployeeId AND r.TaskId = et.TaskId
     WHERE r.id IS NULL
     ORDER BY et.EmployeeId, et.TaskId`,
    { type: Sequelize.QueryTypes.SELECT },
  );

  const now = new Date();
  const ranges = [];
  const skipped = [];
  for (const row of pending) {
    const start = parisTimeOfDay(row.start_time);
    const end = parisTimeOfDay(row.end_time);
    if (start >= end) {
      // Crosses midnight (or is empty): cannot be a time-of-day range.
      skipped.push(`${row.EmployeeId}/${row.TaskId} (${start}-${end})`);
      continue;
    }
    ranges.push({
      EmployeeId: row.EmployeeId,
      TaskId: row.TaskId,
      start_time: start,
      end_time: end,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (skipped.length > 0) {
    console.warn(
      `${TABLE}: ${skipped.length} assignment(s) not backfilled, Task does not end after it starts ` +
        `within one day (Employee/Task): ${skipped.join(", ")}`,
    );
  }

  const chunkSize = 200;
  for (let i = 0; i < ranges.length; i += chunkSize) {
    await queryInterface.bulkInsert(TABLE, ranges.slice(i, i + chunkSize));
  }
  return ranges.length;
}

module.exports = {
  TABLE,
  TIME_ZONE,
  parseStoredInstant,
  parisTimeOfDay,
  createEmployeeTaskTimeRangeTable,
  dropEmployeeTaskTimeRangeTable,
  backfillEmployeeTaskTimeRanges,
};
