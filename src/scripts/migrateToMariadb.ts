import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { QueryTypes, Sequelize } from "sequelize";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, "../../config/config.json");
const config = JSON.parse(readFileSync(configPath, "utf8")) as {
  development: Record<string, unknown>;
};

const SQLITE_PATH =
  process.env.SQLITE_SOURCE_PATH ??
  path.resolve(__dirname, "../../database/database2.sqlite");

const SKIP_TABLES = new Set([
  "Roles",
  "SequelizeMeta",
  "sqlite_sequence",
  "transaction_global_promotions",
]);

const COPY_ORDER = [
  "Users",
  "Recycleries",
  "Employees",
  "Skills",
  "Categories",
  "TaskTemplates",
  "EcoOrganisms",
  "Promotions",
  "CashRegisters",
  "CollectionPoints",
  "Donations",
  "WasteDisposals",
  "EmployeeWorkdays",
  "employee_store",
  "employee_skill",
  "promotion_store",
  "ecoOrg_categoryIn",
  "ecoOrg_categorySell",
  "LabeledItems",
  "CashSessions",
  "TaskSchedules",
  "Tasks",
  "employee_task",
  "employee_schedule",
  "SalesTransactions",
  "transaction_items",
  "GiftCards",
  "giftcard_transactions",
  "transaction_payments",
  "TransactionGlobalPromotions",
  "Arrivals",
] as const;

const JOIN_TABLE_KEYS: Record<string, [string, string]> = {
  employee_store: ["employeeId", "recycleryId"],
  employee_skill: ["employeeId", "skillId"],
  promotion_store: ["promotionId", "storeId"],
  ecoOrg_categoryIn: ["CategoryId", "EcoOrganismId"],
  ecoOrg_categorySell: ["CategoryId", "EcoOrganismId"],
  employee_task: ["EmployeeId", "TaskId"],
  employee_schedule: ["EmployeeId", "TaskScheduleId"],
};

const FK_ORPHAN_CHECKS: Array<{
  table: string;
  column: string;
  parent: string;
  parentColumn?: string;
}> = [
  { table: "employee_store", column: "employeeId", parent: "Employees" },
  { table: "employee_store", column: "recycleryId", parent: "Recycleries" },
  { table: "employee_skill", column: "employeeId", parent: "Employees" },
  { table: "employee_skill", column: "skillId", parent: "Skills" },
  { table: "promotion_store", column: "promotionId", parent: "Promotions" },
  { table: "promotion_store", column: "storeId", parent: "Recycleries" },
  {
    table: "ecoOrg_categoryIn",
    column: "CategoryId",
    parent: "Categories",
  },
  {
    table: "ecoOrg_categoryIn",
    column: "EcoOrganismId",
    parent: "EcoOrganisms",
  },
  {
    table: "ecoOrg_categorySell",
    column: "CategoryId",
    parent: "Categories",
  },
  {
    table: "ecoOrg_categorySell",
    column: "EcoOrganismId",
    parent: "EcoOrganisms",
  },
  { table: "employee_task", column: "EmployeeId", parent: "Employees" },
  { table: "employee_task", column: "TaskId", parent: "Tasks" },
  { table: "employee_schedule", column: "EmployeeId", parent: "Employees" },
  {
    table: "employee_schedule",
    column: "TaskScheduleId",
    parent: "TaskSchedules",
  },
];

function fail(message: string): never {
  console.error(`\n[FAIL] ${message}`);
  process.exit(1);
}

const TIME_COLUMNS = new Set(["arrival_time"]);

function toMariaDbTime(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
    const d = new Date(Number(value));
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(11, 19);
    }
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(11, 19);
    }
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return value;
}

function toMariaDbDateTime(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 23).replace("T", " ");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 23).replace("T", " ");
    }
  }
  return value;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Buffer) return value.toString("utf8");
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return toMariaDbDateTime(value);
}

function normalizeRowValue(
  row: Record<string, unknown>,
  sourceCol: string,
  targetCol?: string,
): unknown {
  const col = targetCol ?? sourceCol;
  let value = row[sourceCol];
  if (
    value == null &&
    (col.endsWith("_at") || col.endsWith("At")) &&
    row.createdAt != null
  ) {
    value = row.createdAt;
  }
  if (TIME_COLUMNS.has(col)) {
    let time = toMariaDbTime(value);
    if (
      typeof time !== "string" ||
      !/^\d{2}:\d{2}:\d{2}$/.test(time)
    ) {
      time = toMariaDbTime(row.arrival_date);
    }
    return time;
  }
  return normalizeValue(value);
}

function quoteId(name: string, dialect: "sqlite" | "mariadb") {
  if (dialect === "sqlite") {
    return `"${name}"`;
  }
  return `\`${name}\``;
}

async function queryRows<T extends Record<string, unknown>>(
  sequelize: Sequelize,
  sql: string,
  replacements?: unknown[],
): Promise<T[]> {
  const options: { type: typeof QueryTypes.SELECT; replacements?: unknown[] } =
    { type: QueryTypes.SELECT };
  if (replacements !== undefined) {
    options.replacements = replacements;
  }
  return (await sequelize.query(sql, options)) as T[];
}

async function tableExists(
  sequelize: Sequelize,
  table: string,
): Promise<boolean> {
  const dialect = sequelize.getDialect();
  if (dialect === "sqlite") {
    const rows = await queryRows<{ name: string }>(
      sequelize,
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [table],
    );
    return rows.length > 0;
  }
  const rows = await queryRows<{ name: string }>(
    sequelize,
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  return rows.length > 0;
}

async function countRows(sequelize: Sequelize, table: string): Promise<number> {
  const q = quoteId(table, sequelize.getDialect() as "sqlite" | "mariadb");
  const rows = await queryRows<{ c: number | string }>(
    sequelize,
    `SELECT COUNT(*) AS c FROM ${q}`,
  );
  return Number(rows[0]?.c ?? 0);
}

async function getTables(sequelize: Sequelize): Promise<string[]> {
  const dialect = sequelize.getDialect();
  if (dialect === "sqlite") {
    const rows = await queryRows<{ name: string }>(
      sequelize,
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    return rows.map((r) => r.name).filter((name) => !SKIP_TABLES.has(name));
  }
  const rows = await queryRows<{ name: string }>(
    sequelize,
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
  );
  return rows.map((r) => r.name).filter((name) => !SKIP_TABLES.has(name));
}

async function hasIdColumn(
  sequelize: Sequelize,
  table: string,
): Promise<boolean> {
  const dialect = sequelize.getDialect();
  if (dialect === "sqlite") {
    const rows = await queryRows<{ name: string }>(
      sequelize,
      `PRAGMA table_info(${table})`,
    );
    return rows.some((c) => c.name === "id");
  }
  const rows = await queryRows<{ name: string }>(
    sequelize,
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'id'`,
    [table],
  );
  return rows.length > 0;
}

async function idBounds(
  sequelize: Sequelize,
  table: string,
): Promise<{ min: number | null; max: number | null }> {
  const q = quoteId(table, sequelize.getDialect() as "sqlite" | "mariadb");
  const rows = await queryRows<{ minId: number | null; maxId: number | null }>(
    sequelize,
    `SELECT MIN(id) AS minId, MAX(id) AS maxId FROM ${q}`,
  );
  const row = rows[0];
  return { min: row?.minId ?? null, max: row?.maxId ?? null };
}

async function distinctPairs(
  sequelize: Sequelize,
  table: string,
  col1: string,
  col2: string,
): Promise<number> {
  const q = quoteId(table, sequelize.getDialect() as "sqlite" | "mariadb");
  const c1 = quoteId(col1, sequelize.getDialect() as "sqlite" | "mariadb");
  const c2 = quoteId(col2, sequelize.getDialect() as "sqlite" | "mariadb");
  const sql =
    sequelize.getDialect() === "sqlite"
      ? `SELECT COUNT(*) AS c FROM (SELECT DISTINCT ${c1}, ${c2} FROM ${q})`
      : `SELECT COUNT(DISTINCT ${c1}, ${c2}) AS c FROM ${q}`;
  const rows = await queryRows<{ c: number | string }>(sequelize, sql);
  return Number(rows[0]?.c ?? 0);
}

async function getNotNullColumns(
  sequelize: Sequelize,
  table: string,
): Promise<Set<string>> {
  const dialect = sequelize.getDialect();
  if (dialect === "sqlite") {
    const rows = await queryRows<{ name: string; notnull: number }>(
      sequelize,
      `PRAGMA table_info(${table})`,
    );
    return new Set(rows.filter((r) => r.notnull === 1).map((r) => r.name));
  }
  const rows = await queryRows<{ name: string }>(
    sequelize,
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND IS_NULLABLE = 'NO'`,
    [table],
  );
  return new Set(rows.map((r) => r.name));
}

async function getTableColumns(
  sequelize: Sequelize,
  table: string,
): Promise<Set<string>> {
  const dialect = sequelize.getDialect();
  if (dialect === "sqlite") {
    const rows = await queryRows<{ name: string }>(
      sequelize,
      `PRAGMA table_info(${table})`,
    );
    return new Set(rows.map((r) => r.name));
  }
  const rows = await queryRows<{ name: string }>(
    sequelize,
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return new Set(rows.map((r) => r.name));
}

const TABLE_NAME_ALIASES: Record<string, string> = {
  transaction_global_promotions: "TransactionGlobalPromotions",
};

const JOIN_TABLE_FK_CHECKS: Record<
  string,
  Array<{ column: string; parent: string }>
> = {
  employee_task: [
    { column: "EmployeeId", parent: "Employees" },
    { column: "TaskId", parent: "Tasks" },
  ],
  employee_schedule: [
    { column: "EmployeeId", parent: "Employees" },
    { column: "TaskScheduleId", parent: "TaskSchedules" },
  ],
};

const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  employee_store: {
    EmployeeId: "employeeId",
    RecycleryId: "recycleryId",
  },
  WasteDisposals: {
    EcoOrganismId: "eco_organism_id",
  },
};

function resolveTargetTable(table: string): string {
  return TABLE_NAME_ALIASES[table] ?? table;
}

async function getValidIds(
  sequelize: Sequelize,
  table: string,
): Promise<Set<number>> {
  const resolved = resolveTargetTable(table);
  if (!(await tableExists(sequelize, resolved))) return new Set();
  const rows = await queryRows<{ id: number | string }>(
    sequelize,
    `SELECT id FROM ${quoteId(resolved, sequelize.getDialect() as "sqlite" | "mariadb")}`,
  );
  return new Set(rows.map((row) => Number(row.id)));
}

function buildColumnMapping(
  table: string,
  sourceColumns: string[],
  targetColumns: Set<string>,
): Array<{ source: string; target: string }> {
  const pairs: Array<{ source: string; target: string }> = [];
  const usedTargets = new Set<string>();

  for (const sourceCol of sourceColumns) {
    if (targetColumns.has(sourceCol) && !usedTargets.has(sourceCol)) {
      pairs.push({ source: sourceCol, target: sourceCol });
      usedTargets.add(sourceCol);
    }
  }

  const aliases = COLUMN_ALIASES[table] ?? {};
  for (const [sourceCol, targetCol] of Object.entries(aliases)) {
    if (
      sourceColumns.includes(sourceCol) &&
      targetColumns.has(targetCol) &&
      !usedTargets.has(targetCol)
    ) {
      pairs.push({ source: sourceCol, target: targetCol });
      usedTargets.add(targetCol);
    }
  }

  return pairs;
}

const skippedByTable: Record<string, number> = {};

async function copyTable(
  source: Sequelize,
  target: Sequelize,
  table: string,
): Promise<number> {
  if (!(await tableExists(source, table))) {
    console.log(`  skip ${table} (not in source)`);
    return 0;
  }
  if (!(await tableExists(target, resolveTargetTable(table)))) {
    fail(`Target missing table ${resolveTargetTable(table)}. Run db:migrate first.`);
  }

  const sourceCount = await countRows(source, table);
  if (sourceCount === 0) {
    console.log(`  ${table}: 0 rows`);
    return 0;
  }

  const [rows] = await source.query(`SELECT * FROM ${quoteId(table, "sqlite")}`);
  const data = rows as Record<string, unknown>[];
  if (!data.length) return 0;

  const sourceColumns = Object.keys(data[0] ?? {});
  const targetColumns = await getTableColumns(target, resolveTargetTable(table));
  const notNullColumns = await getNotNullColumns(target, resolveTargetTable(table));
  const columnMapping = buildColumnMapping(table, sourceColumns, targetColumns);
  const skipped = sourceColumns.filter(
    (col) =>
      !columnMapping.some((pair) => pair.source === col) &&
      !Object.keys(COLUMN_ALIASES[table] ?? {}).includes(col),
  );
  if (skipped.length) {
    console.log(`  ${table}: ignoring unmapped source columns: ${skipped.join(", ")}`);
  }
  if (!columnMapping.length) {
    fail(`${table}: no overlapping columns between source and target`);
  }

  const columns = columnMapping.map((pair) => pair.target);
  const quotedCols = columns
    .map((c) => quoteId(c, "mariadb"))
    .join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  const targetTable = resolveTargetTable(table);
  const joinChecks = JOIN_TABLE_FK_CHECKS[table] ?? [];
  const parentIdSets: Record<string, Set<number>> = {};
  for (const check of joinChecks) {
    parentIdSets[check.parent] ??= await getValidIds(target, check.parent);
  }

  await target.query("SET FOREIGN_KEY_CHECKS = 0");
  await target.query(`DELETE FROM ${quoteId(targetTable, "mariadb")}`);
  let copied = 0;
  let skippedRows = 0;
  try {
    for (const row of data) {
      const values = columnMapping.map((pair) =>
        normalizeRowValue(row, pair.source, pair.target),
      );
      const violatesNotNull = columnMapping.some(
        (pair, index) =>
          notNullColumns.has(pair.target) &&
          pair.target !== "id" &&
          (values[index] === null || values[index] === undefined),
      );
      if (violatesNotNull) {
        skippedRows += 1;
        continue;
      }
      if (joinChecks.length) {
        const invalidJoin = joinChecks.some((check) => {
          const pair = columnMapping.find((p) => p.source === check.column);
          if (!pair) return false;
          const id = Number(row[pair.source]);
          return !parentIdSets[check.parent]?.has(id);
        });
        if (invalidJoin) {
          skippedRows += 1;
          continue;
        }
      }
      await target.query(
        `INSERT INTO ${quoteId(targetTable, "mariadb")} (${quotedCols}) VALUES (${placeholders})`,
        { replacements: values },
      );
      copied += 1;
    }
  } finally {
    await target.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  if (skippedRows > 0) {
    skippedByTable[table] = skippedRows;
    console.log(`  ${table}: skipped ${skippedRows} invalid row(s)`);
  }

  if (await hasIdColumn(target, targetTable)) {
    const { max } = await idBounds(target, targetTable);
    if (max != null) {
      await target.query(
        `ALTER TABLE ${quoteId(targetTable, "mariadb")} AUTO_INCREMENT = ?`,
        { replacements: [max + 1] },
      );
    }
  }

  console.log(`  ${table}: ${copied} rows copied`);
  return copied;
}

async function verifyIntegrity(source: Sequelize, target: Sequelize) {
  console.log("\n=== Integrity checks ===");
  const sourceTables = await getTables(source);
  const errors: string[] = [];

  for (const table of sourceTables) {
    if (SKIP_TABLES.has(table)) continue;
    if (!(await tableExists(target, resolveTargetTable(table)))) {
      if ((await countRows(source, table)) > 0) {
        errors.push(
          `${table}: exists in source with data but missing in target`,
        );
      }
      continue;
    }

    const resolved = resolveTargetTable(table);
    const sourceCount = await countRows(source, table);
    const expectedCount = sourceCount - (skippedByTable[table] ?? 0);
    const targetCount = await countRows(target, resolved);
    const status = expectedCount === targetCount ? "OK" : "MISMATCH";
    console.log(
      `  [${status}] ${table}: source=${sourceCount} expected=${expectedCount} target=${targetCount}`,
    );
    if (expectedCount !== targetCount) {
      errors.push(
        `${table}: row count expected ${expectedCount} != target ${targetCount}`,
      );
    }

    if (await hasIdColumn(source, table)) {
      const s = await idBounds(source, table);
      const t = await idBounds(target, resolved);
      if (s.min !== t.min || s.max !== t.max) {
        errors.push(
          `${table}: id bounds source(min=${s.min},max=${s.max}) != target(min=${t.min},max=${t.max})`,
        );
      }
    }

    const joinKeys = JOIN_TABLE_KEYS[table];
    if (joinKeys) {
      const [c1, c2] = joinKeys;
      const sourcePairs = await distinctPairs(source, table, c1, c2);
      const targetPairs = await distinctPairs(target, resolved, c1, c2);
      const skipped = skippedByTable[table] ?? 0;
      if (skipped > 0) {
        if (targetPairs > sourcePairs) {
          errors.push(
            `${table}: distinct pairs target ${targetPairs} > source ${sourcePairs}`,
          );
        } else {
          console.log(
            `  [OK] ${table}: distinct pairs source=${sourcePairs} target=${targetPairs} (${skipped} invalid rows skipped)`,
          );
        }
      } else if (sourcePairs !== targetPairs) {
        errors.push(
          `${table}: distinct pairs ${sourcePairs} != ${targetPairs}`,
        );
      }
    }
  }

  for (const onlySource of sourceTables) {
    if (onlySource === "Roles") {
      const c = await countRows(source, onlySource).catch(() => 0);
      if (c > 0) {
        console.log(`  [SKIP] Roles: ${c} rows in source (intentionally not migrated)`);
      }
    }
  }

  for (const check of FK_ORPHAN_CHECKS) {
    if (!(await tableExists(target, check.table))) continue;
    const parentCol = check.parentColumn ?? "id";
    const rows = await queryRows<{ c: number | string }>(
      target,
      `SELECT COUNT(*) AS c FROM ${quoteId(check.table, "mariadb")} j
       LEFT JOIN ${quoteId(check.parent, "mariadb")} p ON j.${quoteId(check.column, "mariadb")} = p.${quoteId(parentCol, "mariadb")}
       WHERE p.${quoteId(parentCol, "mariadb")} IS NULL`,
    );
    const orphans = Number(rows[0]?.c ?? 0);
    if (orphans > 0) {
      errors.push(`${check.table}.${check.column}: ${orphans} orphan FK(s)`);
    } else {
      console.log(`  [OK] ${check.table}.${check.column}: no orphans`);
    }
  }

  const aggregateChecks = [
    {
      label: "SalesTransactions.total_amount",
      sql: "SELECT COALESCE(SUM(total_amount), 0) AS v, COUNT(*) AS c FROM `SalesTransactions`",
    },
    {
      label: "transaction_payments.amount",
      sql: "SELECT COALESCE(SUM(amount), 0) AS v, COUNT(*) AS c FROM `transaction_payments`",
    },
  ] as const;

  for (const check of aggregateChecks) {
    if (
      !(await tableExists(source, check.sql.match(/FROM `([^`]+)`/)?.[1] ?? ""))
    ) {
      continue;
    }
    const tableName = check.sql.match(/FROM `([^`]+)`/)?.[1] ?? "";
    const sRows = await queryRows<{ v: string; c: number }>(
      source,
      check.sql.replace(/`/g, '"'),
    );
    const tRows = await queryRows<{ v: string; c: number }>(target, check.sql);
    const s = sRows[0];
    const t = tRows[0];
    const sumDiff = Math.abs(Number(s?.v) - Number(t?.v));
    const sumMatch = sumDiff <= Math.max(1, Number(s?.c)) * 0.02;
    const countMatch = Number(s?.c) === Number(t?.c);
    if (!sumMatch || !countMatch) {
      errors.push(
        `${check.label}: source(sum=${s?.v},count=${s?.c}) != target(sum=${t?.v},count=${t?.c})`,
      );
    } else {
      console.log(`  [OK] ${check.label}: sum=${t?.v} count=${t?.c}`);
    }
    void tableName;
  }

  if (errors.length) {
    console.error("\nIntegrity failures:");
    for (const err of errors) console.error(`  - ${err}`);
    fail(`${errors.length} integrity check(s) failed`);
  }

  console.log("\nAll integrity checks passed.");
}

async function main() {
  const source = new Sequelize({
    dialect: "sqlite",
    storage: SQLITE_PATH,
    logging: false,
  });

  const dev = config.development;
  const target = new Sequelize(
    (dev.database as string) ?? "recyclerie",
    (dev.username as string) ?? "recyclerie",
    (dev.password as string) ?? "recyclerie_dev",
    {
      host: (dev.host as string) ?? "127.0.0.1",
      port: (dev.port as number) ?? 3306,
      dialect: "mariadb",
      logging: false,
    },
  );

  try {
    await source.authenticate();
    await target.authenticate();
    console.log(`Source: ${SQLITE_PATH}`);
    console.log(
      `Target: mariadb://${dev.username}@${dev.host}:${dev.port}/${dev.database}`,
    );

    const meta = await queryRows<{ c: number | string }>(
      target,
      "SELECT COUNT(*) AS c FROM SequelizeMeta",
    );
    const applied = Number(meta[0]?.c ?? 0);
    if (applied < 31) {
      fail(
        `Target has ${applied}/31 migrations. Run: npm run db:migrate`,
      );
    }

    console.log("\n=== Pre-copy row counts (source) ===");
    for (const table of COPY_ORDER) {
      if (await tableExists(source, table)) {
        console.log(`  ${table}: ${await countRows(source, table)}`);
      }
    }

    console.log("\n=== Copying data ===");
    for (const table of COPY_ORDER) {
      await copyTable(source, target, table);
    }

    await verifyIntegrity(source, target);
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
