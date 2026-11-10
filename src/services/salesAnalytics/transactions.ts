import type { IsoDate } from "@recyclerie/api";
import { col } from "sequelize";
import z from "zod";
import { TRANSACTION_TYPES } from "../../constants/dbEnums.js";
import db from "../../models/index.js";
import { toIsoDate, toIsoTime } from "../../utils/dates.js";
import { dateColumn, numberColumn, parseRawRows } from "./rawRows.js";
import {
  transactionKind,
  transactionScope,
  type LoadScope,
  type TransactionKind,
} from "./scope.js";

const { SalesTransaction } = db;

/** A Sale or a Refund in scope, as plain numbers. */
export type AnalyticsTransaction = {
  id: number;
  kind: TransactionKind;
  createdAt: Date;
  /** `total_amount`: positive for Refunds too. */
  amount: number;
  /** `total_amount_before_promotion`: before the whole-transaction discount. */
  amountBeforeDiscount: number;
  /** The Store of the transaction's own cash session. */
  storeId: number;
  /** For a Refund, the Sale it refunds. */
  refundedSaleId: number | null;
  postalCode: string | null;
};

/** A `loadTransactions` row, as an `AnalyticsTransaction`. */
const transactionRow = z
  .object({
    id: numberColumn,
    transactionType: z.enum(TRANSACTION_TYPES),
    createdAt: dateColumn,
    total_amount: numberColumn,
    total_amount_before_promotion: numberColumn,
    transactionId: numberColumn.nullable(),
    customer_postal_code: z.string().nullable(),
    storeId: numberColumn,
  })
  .transform(
    (row): AnalyticsTransaction => ({
      id: row.id,
      kind: transactionKind(row.transactionType),
      createdAt: row.createdAt,
      amount: row.total_amount,
      amountBeforeDiscount: row.total_amount_before_promotion,
      storeId: row.storeId,
      refundedSaleId: row.transactionId,
      postalCode: row.customer_postal_code,
    }),
  );

/**
 * Sales and Refunds in scope. SQL only filters; sum, bucket and split the rows
 * in JS (no date or time-zone SQL, which differs between SQLite and MariaDB).
 */
export const loadTransactions = async (
  scope: LoadScope,
): Promise<AnalyticsTransaction[]> => {
  const rows = await SalesTransaction.findAll({
    attributes: [
      "id",
      "transactionType",
      "createdAt",
      "total_amount",
      "total_amount_before_promotion",
      "transactionId",
      "customer_postal_code",
      [col("CashSession.CashRegister.recyclery_id"), "storeId"],
    ],
    ...transactionScope(scope),
    order: [["createdAt", "ASC"]],
    raw: true,
  });
  return parseRawRows(transactionRow, rows);
};

/** Number of transactions and their summed amount. */
export type Totals = { count: number; amount: number };

const sum = (transactions: AnalyticsTransaction[]): Totals => ({
  count: transactions.length,
  amount: transactions.reduce((total, t) => total + t.amount, 0),
});

/** Sales and Refunds: how many, and how much. Net revenue = `sales.amount − refunds.amount`. */
export const sumTransactions = (
  transactions: AnalyticsTransaction[],
): { sales: Totals; refunds: Totals } => ({
  sales: sum(transactions.filter((t) => t.kind === "sale")),
  refunds: sum(transactions.filter((t) => t.kind === "refund")),
});

/** Paris calendar date of an instant. */
export const parisDay = (instant: Date): IsoDate => toIsoDate(instant);

/** Paris clock hour (0–23) of an instant. */
export const parisHour = (instant: Date): number =>
  Number(toIsoTime(instant).slice(0, 2));

/** **Opening days**: Paris calendar days with at least one Sale, in order. */
export const openingDays = (transactions: AnalyticsTransaction[]): IsoDate[] =>
  [
    ...new Set(
      transactions.filter((t) => t.kind === "sale").map((t) => parisDay(t.createdAt)),
    ),
  ].sort();
