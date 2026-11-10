import { sumCashInPayments } from "@recyclerie/api/domain/cart";
import {
  PAYMENT_METHODS,
  SALES_PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type PaymentMethod,
  type SalesPaymentMethod,
} from "@recyclerie/api/enums";
import { col } from "sequelize";
import z from "zod";
import db from "../../models/index.js";
import { numberColumn, parseRawRows } from "./rawRows.js";
import {
  transactionInclude,
  transactionKind,
  transactionScope,
  type LoadScope,
  type TransactionKind,
} from "./scope.js";

const { SalesTransaction, TransactionPayment } = db;

/** What one payment method took in on a Sale, or paid out on a Refund. */
export type MethodAmount = {
  /** A payment row's method; `mixed` only for an old transaction with no rows. */
  method: SalesPaymentMethod;
  /** Cash: what the till kept, change excluded. Positive for Refunds too. */
  amount: number;
  /** Payment rows behind it; 1 for an old transaction with none. */
  count: number;
};

/** One method of a Sale or Refund in scope. */
export type AnalyticsPayment = MethodAmount & {
  transactionId: number;
  kind: TransactionKind;
  /** The Store of the transaction's own cash session. */
  storeId: number;
};

/** A transaction with its payment rows, as plain numbers. */
export type PaidTransaction = {
  /** `total_amount`. */
  amount: number;
  /** `payment_method`: the single row's method, or `mixed`. */
  paymentMethod: SalesPaymentMethod;
  /** `transaction_payments` rows. A cash row's amount is what was handed over, change included. */
  payments: { method: PaymentMethod; amount: number }[];
};

/**
 * Cash kept on a transaction: `total_amount − Σ non-cash payments`, the till's
 * own rule for closing a cash session. It signs Refunds negative, so it is
 * read on a `sell` to get an amount.
 */
const cashKept = ({ amount, paymentMethod, payments }: PaidTransaction) =>
  sumCashInPayments([
    { transactionType: "sell", total_amount: amount, payment_method: paymentMethod, payments },
  ]);

/**
 * A transaction's amount per payment method. Cash is what the till kept
 * (change excluded); every other method is the sum of its rows. A transaction
 * with no payment rows (older than the payments table: Refunds were never
 * backfilled) counts as one payment of its `payment_method` for its
 * `total_amount`.
 */
export const amountsByMethod = (transaction: PaidTransaction): MethodAmount[] => {
  const rows: { method: SalesPaymentMethod; amount: number }[] =
    transaction.payments.length > 0
      ? transaction.payments
      : [{ method: transaction.paymentMethod, amount: transaction.amount }];
  const byMethod = new Map<SalesPaymentMethod, MethodAmount>();
  for (const row of rows) {
    const entry = byMethod.get(row.method) ?? { method: row.method, amount: 0, count: 0 };
    entry.amount += row.amount;
    entry.count += 1;
    byMethod.set(row.method, entry);
  }
  const cash = byMethod.get("cash");
  if (cash) cash.amount = cashKept(transaction);
  return [...byMethod.values()];
};

/** A transaction row of `loadPayments`. */
const transactionRow = z.object({
  id: numberColumn,
  transactionType: z.enum(TRANSACTION_TYPES),
  total_amount: numberColumn,
  payment_method: z.enum(SALES_PAYMENT_METHODS),
  storeId: numberColumn,
});

/** A `transaction_payments` row of `loadPayments`. */
const paymentRow = z.object({
  transactionId: numberColumn,
  method: z.enum(PAYMENT_METHODS),
  amount: numberColumn,
});

/**
 * What each payment method took in on the Sales in scope and paid out on its
 * Refunds: one entry per transaction and method (see `amountsByMethod`).
 */
export const loadPayments = async (scope: LoadScope): Promise<AnalyticsPayment[]> => {
  const [transactionRows, paymentRows] = await Promise.all([
    SalesTransaction.findAll({
      attributes: [
        "id",
        "transactionType",
        "total_amount",
        "payment_method",
        [col("CashSession.CashRegister.recyclery_id"), "storeId"],
      ],
      ...transactionScope(scope),
      raw: true,
    }),
    TransactionPayment.findAll({
      attributes: [
        [col("TransactionPayment.sales_transaction_id"), "transactionId"],
        "method",
        "amount",
      ],
      include: [transactionInclude(scope)],
      raw: true,
    }),
  ]);
  const payments = parseRawRows(paymentRow, paymentRows);

  const rowsByTransaction = Map.groupBy(payments, (row) => row.transactionId);
  return parseRawRows(transactionRow, transactionRows).flatMap((row) => {
    const transactionId = row.id;
    const kind = transactionKind(row.transactionType);
    const storeId = row.storeId;
    return amountsByMethod({
      amount: row.total_amount,
      paymentMethod: row.payment_method,
      payments: (rowsByTransaction.get(transactionId) ?? []).map(({ method, amount }) => ({
        method,
        amount,
      })),
    }).map((split) => ({ transactionId, kind, storeId, ...split }));
  });
};
