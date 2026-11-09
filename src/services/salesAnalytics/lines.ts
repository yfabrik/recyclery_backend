import { getCartLinePrice } from "@recyclerie/api/domain/cart";
import { col } from "sequelize";
import db from "../../models/index.js";
import { transactionInclude, type LoadScope } from "./scope.js";

const { LabeledItem, TransactionItem } = db;

/** A Sale or Refund line in scope, valued. */
export type AnalyticsLine = {
  transactionId: number;
  kind: "sale" | "refund";
  storeId: number;
  quantity: number;
  /** The item's most specific category: `subcategory_id`, else `category_id`. Null when it has none. */
  categoryId: number | null;
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
};

type LineRow = {
  transactionId: number | string;
  transactionType: string;
  transactionAmount: number | string;
  storeId: number | string;
  quantity: number | string;
  price: number | string;
  promotionValue: number | string | null;
  bundleQuantity: number | string | null;
  bundlePrice: number | string | null;
  categoryId: number | string | null;
  subcategoryId: number | string | null;
};

const toNumberOrNull = (value: number | string | null) =>
  value == null ? null : Number(value);

/**
 * Sale and Refund lines in scope. Line values are computed in JS with the
 * till's own `getCartLinePrice` (the SQL `totalPriceExpr` is wrong on
 * SQLite), then each transaction's amount is shared over its lines.
 */
export const loadLines = async (scope: LoadScope): Promise<AnalyticsLine[]> => {
  const rows = (await TransactionItem.findAll({
    attributes: [
      [col("TransactionItem.transaction_id"), "transactionId"],
      [col("SalesTransaction.transactionType"), "transactionType"],
      [col("SalesTransaction.total_amount"), "transactionAmount"],
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
  })) as unknown as LineRow[];

  const lines = rows.map((row) => {
    const cartLine = {
      price: Number(row.price),
      quantity: Number(row.quantity),
      promotion: Number(row.promotionValue ?? 0),
      bundleQuantity: toNumberOrNull(row.bundleQuantity),
      bundlePrice: toNumberOrNull(row.bundlePrice),
    };
    return {
      transactionId: Number(row.transactionId),
      kind: row.transactionType === "refund" ? ("refund" as const) : ("sale" as const),
      storeId: Number(row.storeId),
      quantity: cartLine.quantity,
      categoryId: toNumberOrNull(row.subcategoryId) ?? toNumberOrNull(row.categoryId),
      listValue: getCartLinePrice({ ...cartLine, promotion: 0 }),
      value: getCartLinePrice(cartLine),
      transactionAmount: Number(row.transactionAmount),
    };
  });

  const byTransaction = new Map<number, { value: number; quantity: number }>();
  for (const line of lines) {
    const sums = byTransaction.get(line.transactionId) ?? { value: 0, quantity: 0 };
    sums.value += line.value;
    sums.quantity += line.quantity;
    byTransaction.set(line.transactionId, sums);
  }
  return lines.map(({ transactionAmount, ...line }) => {
    const sums = byTransaction.get(line.transactionId) ?? { value: 0, quantity: 0 };
    // Lines all worth 0 (MariaDB's DECIMAL(10,0) `price` drops the cents of a
    // 0.40 € item): share by quantity so the amount is not lost.
    const share =
      sums.value > 0
        ? line.value / sums.value
        : sums.quantity > 0
          ? line.quantity / sums.quantity
          : 0;
    return { ...line, net: transactionAmount * share };
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
  categoryId: number | null;
  sales: LineTotals;
  refunds: LineTotals;
};

const emptyTotals = (): LineTotals => ({ quantity: 0, listValue: 0, value: 0, net: 0 });

/**
 * Lines summed per most specific category, Sales and Refunds apart. Roll up
 * with `categoryPath`. `Σ (sales.net − refunds.net)` is net revenue.
 */
export const sumLinesByCategory = (lines: AnalyticsLine[]): CategoryLineTotals[] => {
  const byCategory = new Map<number | null, CategoryLineTotals>();
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
