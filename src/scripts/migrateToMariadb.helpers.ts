import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const helpersDir = path.dirname(fileURLToPath(import.meta.url));

export const FUTURE_MIGRATIONS_DIR = path.resolve(
  helpersDir,
  "../future_migrations",
);

export function countFutureMigrations(): number {
  return readdirSync(FUTURE_MIGRATIONS_DIR).filter((name) =>
    name.endsWith(".cjs"),
  ).length;
}

export const COPY_ORDER = [
  "Users",
  "Recycleries",
  "Employees",
  "EmployeeVacations",
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
  "employee_task_time_range",
  "employee_schedule",
  "SalesTransactions",
  "transaction_items",
  "GiftCards",
  "giftcard_transactions",
  "transaction_payments",
  "TransactionGlobalPromotions",
  "Arrivals",
] as const;

export type CopyTable = (typeof COPY_ORDER)[number];

export type IdBoundRange = { min: number | null; max: number | null };

export function idBoundsEqual(a: IdBoundRange, b: IdBoundRange): boolean {
  const eq = (left: number | null, right: number | null) => {
    if (left == null && right == null) return true;
    if (left == null || right == null) return false;
    return Number(left) === Number(right);
  };
  return eq(a.min, b.min) && eq(a.max, b.max);
}

export function expectedIdBounds(args: {
  source: IdBoundRange;
  copied: IdBoundRange | undefined;
  skipped: number;
}): IdBoundRange {
  if (args.skipped > 0) {
    return args.copied ?? { min: null, max: null };
  }
  return args.source;
}

const TIME_ONLY = /^\d{2}:\d{2}:\d{2}$/;
const DIGITS_ONLY = /^\d+$/;
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export function toMariaDbTime(value: unknown): unknown {
  if (value == null) return value;
  if (
    typeof value === "number" ||
    (typeof value === "string" && DIGITS_ONLY.test(value))
  ) {
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

export function toMariaDbDateTime(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 23).replace("T", " ");
  }
  if (typeof value === "string" && DATE_PREFIX.test(value.trim())) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 23).replace("T", " ");
    }
  }
  return value;
}

export function normalizeValue(value: unknown): unknown {
  if (value instanceof Buffer) return value.toString("utf8");
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return toMariaDbDateTime(value);
}

function isTimeColumn(col: string): boolean {
  return col === "arrival_time";
}

/** Tables whose start_time / end_time are TIME columns (Tasks' are DATETIME). */
const TIME_OF_DAY_TABLES = new Set(["employee_task_time_range"]);

const TIME_TEXT = /^(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

/** SQLite hands TIME back as the text that was written: "HH:MM" or "HH:MM:SS". */
export function normalizeTimeText(value: unknown): unknown {
  if (typeof value === "string") {
    const match = TIME_TEXT.exec(value.trim());
    if (match) return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
  }
  return toMariaDbTime(value);
}

export function normalizeRowValue(
  row: Record<string, unknown>,
  sourceCol: string,
  targetCol?: string,
  table?: string,
): unknown {
  const col = targetCol ?? sourceCol;
  let value = row[sourceCol];
  if (
    table !== undefined &&
    TIME_OF_DAY_TABLES.has(table) &&
    (col === "start_time" || col === "end_time")
  ) {
    return normalizeTimeText(value);
  }
  if (
    value == null &&
    (col.endsWith("_at") || col.endsWith("At")) &&
    row.createdAt != null
  ) {
    value = row.createdAt;
  }
  if (isTimeColumn(col)) {
    let time = toMariaDbTime(value);
    if (typeof time !== "string" || !TIME_ONLY.test(time)) {
      time = toMariaDbTime(row.arrival_date);
    }
    return time;
  }
  return normalizeValue(value);
}
