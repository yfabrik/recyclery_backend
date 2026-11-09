import { sumCashInPayments } from "@recyclerie/api/domain/cart";
import type { PaymentMethod, SalesPaymentMethod } from "@recyclerie/api/enums";
import { col } from "sequelize";
import db from "../../models/index.js";
import { transactionInclude, transactionScope, type LoadScope } from "./scope.js";

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
  kind: "sale" | "refund";
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

type TransactionRow = {
  id: number | string;
  transactionType: string;
  total_amount: number | string;
  payment_method: SalesPaymentMethod;
  storeId: number | string;
};

type PaymentRow = {
  transactionId: number | string;
  method: PaymentMethod;
  amount: number | string;
};

/**
 * What each payment method took in on the Sales in scope and paid out on its
 * Refunds: one entry per transaction and method (see `amountsByMethod`).
 */
export const loadPayments = async (scope: LoadScope): Promise<AnalyticsPayment[]> => {
  const [transactions, payments] = (await Promise.all([
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
  ])) as unknown as [TransactionRow[], PaymentRow[]];

  const rowsByTransaction = Map.groupBy(payments, (row) => Number(row.transactionId));
  return transactions.flatMap((row) => {
    const transactionId = Number(row.id);
    const kind = row.transactionType === "refund" ? ("refund" as const) : ("sale" as const);
    const storeId = Number(row.storeId);
    return amountsByMethod({
      amount: Number(row.total_amount),
      paymentMethod: row.payment_method,
      payments: (rowsByTransaction.get(transactionId) ?? []).map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
      })),
    }).map((split) => ({ transactionId, kind, storeId, ...split }));
  });
};
