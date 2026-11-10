import { getCartLinePrice } from "@recyclerie/api/domain/cart";
import { col } from "sequelize";
import z from "zod";
import { TRANSACTION_TYPES } from "../../constants/dbEnums.js";
import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";
import { numberColumn, parseRawRows } from "./rawRows.js";
import {
  transactionInclude,
  transactionKind,
  type LoadScope,
  type TransactionKind,
} from "./scope.js";

const { LabeledItem, TransactionItem } = db;

/** A Sale or Refund line in scope, valued. */
export type AnalyticsLine = {
  transactionId: Models["SalesTransaction"]["id"];
  kind: TransactionKind;
  storeId: Models["Recyclery"]["id"];
  quantity: number;
  /** The item's most specific category: `subcategory_id`, else `category_id`. Null when it has none. */
  categoryId: Models["Category"]["id"] | null;
  /** Value before Category promotion (bundle prices included). */
  listValue: number;
  /** **Line value**: after Category promotion, before whole-transaction discount (`total_price`). */
  value: number;
  /**
   * The line's share of its transaction's `total_amount`, pro rata to `value`.
   * Takes off the whole-transaction discount, and always adds up to the
   * transaction's amount, Refunds included (a Refund's lines carry the sold
   * prices, not what was paid back).
   */
  net: number;
  /**
   * The line's share of its transaction's whole-transaction discount
   * (`total_amount_before_promotion − total_amount`), pro rata like `net`.
   * 0 on Refund lines: a Refund's amount is already net of it.
   */
  wholeTransactionDiscount: number;
};

/** A `loadLines` row, valued; its transaction's amounts are shared afterwards. */
const lineRow = z
  .object({
    transactionId: numberColumn,
    transactionType: z.enum(TRANSACTION_TYPES),
    transactionAmount: numberColumn,
    transactionAmountBeforeDiscount: numberColumn,
    storeId: numberColumn,
    quantity: numberColumn,
    price: numberColumn,
    promotionValue: numberColumn.nullable(),
    bundleQuantity: numberColumn.nullable(),
    bundlePrice: numberColumn.nullable(),
    categoryId: numberColumn.nullable(),
    subcategoryId: numberColumn.nullable(),
  })
  .transform((row) => {
    const cartLine = {
      price: row.price,
      quantity: row.quantity,
      promotion: row.promotionValue ?? 0,
      bundleQuantity: row.bundleQuantity,
      bundlePrice: row.bundlePrice,
    };
    return {
      transactionId: row.transactionId,
      kind: transactionKind(row.transactionType),
      storeId: row.storeId,
      quantity: cartLine.quantity,
      categoryId: row.subcategoryId ?? row.categoryId,
      listValue: getCartLinePrice({ ...cartLine, promotion: 0 }),
      value: getCartLinePrice(cartLine),
      transactionAmount: row.transactionAmount,
      transactionAmountBeforeDiscount: row.transactionAmountBeforeDiscount,
    };
  });

/**
 * Sale and Refund lines in scope. Line values are computed in JS with the
 * till's own `getCartLinePrice` (the SQL `totalPriceExpr` is wrong on
 * SQLite), then each transaction's amount and whole-transaction discount are
 * shared over its lines. The one pro-rata share of the analytics routes.
 */
export const loadLines = async (scope: LoadScope): Promise<AnalyticsLine[]> => {
  const rows = await TransactionItem.findAll({
    attributes: [
      [col("TransactionItem.transaction_id"), "transactionId"],
      [col("SalesTransaction.transactionType"), "transactionType"],
      [col("SalesTransaction.total_amount"), "transactionAmount"],
      [col("SalesTransaction.total_amount_before_promotion"), "transactionAmountBeforeDiscount"],
      [col("SalesTransaction.CashSession.CashRegister.recyclery_id"), "storeId"],
      "quantity",
      "price",
      "promotionValue",
      "bundleQuantity",
      "bundlePrice",
      [col("LabeledItem.category_id"), "categoryId"],
      [col("LabeledItem.subcategory_id"), "subcategoryId"],
    ],
    include: [
      transactionInclude(scope),
      { model: LabeledItem, required: false, attributes: [] },
    ],
    raw: true,
  });
  const lines = parseRawRows(lineRow, rows);

  const byTransaction = new Map<number, { value: number; quantity: number }>();
  for (const line of lines) {
    const sums = byTransaction.get(line.transactionId) ?? { value: 0, quantity: 0 };
    sums.value += line.value;
    sums.quantity += line.quantity;
    byTransaction.set(line.transactionId, sums);
  }
  return lines.map(({ transactionAmount, transactionAmountBeforeDiscount, ...line }) => {
    const sums = byTransaction.get(line.transactionId) ?? { value: 0, quantity: 0 };
    // Lines all worth 0 (MariaDB's DECIMAL(10,0) `price` drops the cents of a
    // 0.40 € item): share by quantity so the amount is not lost.
    const share =
      sums.value > 0
        ? line.value / sums.value
        : sums.quantity > 0
          ? line.quantity / sums.quantity
          : 0;
    return {
      ...line,
      net: transactionAmount * share,
      wholeTransactionDiscount: (transactionAmountBeforeDiscount - transactionAmount) * share,
    };
  });
};

/** **Items sold**: quantity on Sale lines − quantity on Refund lines. */
export const itemsSold = (lines: AnalyticsLine[]) =>
  lines.reduce(
    (total, line) => total + (line.kind === "sale" ? line.quantity : -line.quantity),
    0,
  );

export type LineTotals = Pick<AnalyticsLine, "quantity" | "listValue" | "value" | "net">;

export type CategoryLineTotals = {
  categoryId: AnalyticsLine["categoryId"];
  sales: LineTotals;
  refunds: LineTotals;
};

const emptyTotals = (): LineTotals => ({ quantity: 0, listValue: 0, value: 0, net: 0 });

/**
 * Lines summed per most specific category, Sales and Refunds apart. Roll up
 * with `categoryPath`. `Σ (sales.net − refunds.net)` is net revenue.
 */
export const sumLinesByCategory = (lines: AnalyticsLine[]): CategoryLineTotals[] => {
  const byCategory = new Map<AnalyticsLine["categoryId"], CategoryLineTotals>();
  for (const line of lines) {
    const entry = byCategory.get(line.categoryId) ?? {
      categoryId: line.categoryId,
      sales: emptyTotals(),
      refunds: emptyTotals(),
    };
    const side = line.kind === "sale" ? entry.sales : entry.refunds;
    side.quantity += line.quantity;
    side.listValue += line.listValue;
    side.value += line.value;
    side.net += line.net;
    byCategory.set(line.categoryId, entry);
  }
  return [...byCategory.values()];
};
