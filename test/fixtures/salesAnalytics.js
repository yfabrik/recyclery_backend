/**
 * Fixtures for the sales analytics routes: Stores with a till, and Sales and
 * Refunds written straight to the models at a chosen instant, with amounts
 * computed the way the till computes them (`@recyclerie/api/domain/cart`).
 */
import {
  getCartLinePrice,
  getCartTotalWithGlobalPromotion,
} from "@recyclerie/api/domain/cart";
import db from "../../src/models/index";
import {
  createCashRegister,
  createCategory,
  createOpenSession,
  createRecyclery,
  createUser,
} from "../models/helpers.js";

const {
  LabeledItem,
  SalesTransaction,
  TransactionGlobalPromotion,
  TransactionItem,
  TransactionPayment,
} = db;

export { createCategory };

/**
 * A Store with one cash register and one cash session.
 * @param {string} [name]
 */
export async function createStore(name) {
  const cashier = await createUser({ role: "employee" });
  const store = await createRecyclery(name ? { name } : {});
  const register = await createCashRegister(store.id);
  const session = await createOpenSession({
    registerId: register.id,
    userId: cashier.id,
  });
  return { store, register, session, cashier };
}

/**
 * @typedef {{
 *   price: number,
 *   quantity?: number,
 *   category: { id: number },
 *   subcategory?: { id: number } | null,
 *   promotion?: number,
 *   bundleQuantity?: number | null,
 *   bundlePrice?: number | null,
 * }} FixtureLine
 */

const toCartLine = (line) => ({
  price: line.price,
  quantity: line.quantity ?? 1,
  promotion: line.promotion ?? 0,
  bundleQuantity: line.bundleQuantity ?? null,
  bundlePrice: line.bundlePrice ?? null,
});

const toTransactionItemLine = (cartLine) => ({
  price: cartLine.price,
  quantity: cartLine.quantity,
  promotionValue: cartLine.promotion,
  bundleQuantity: cartLine.bundleQuantity,
  bundlePrice: cartLine.bundlePrice,
});

/**
 * A Sale (or a pending / cancelled transaction) at instant `at`.
 * One labeled item per line.
 * @param {{ id: number, cash_register_id?: number }} session
 * @param {{
 *   at: string | Date,
 *   lines: FixtureLine[],
 *   globalPromotion?: { type: "percent" | "fixed", value: number },
 *   status?: "completed" | "pending" | "cancelled",
 *   postalCode?: string | null,
 *   payments?: { method: string, amount: number }[],
 *   amount?: number,
 * }} opts `amount` overrides the `total_amount` computed from the lines
 *   (e.g. lines priced 0 €, as MariaDB's DECIMAL(10,0) `price` stores 0.40 €).
 * @returns {Promise<{ sale: import("../../src/models/salestransaction.js").default, items: import("../../src/models/labeleditem.js").default[] }>}
 */
export async function recordSale(
  session,
  { at, lines, globalPromotion, status = "completed", postalCode = null, payments, amount },
) {
  const cartLines = lines.map(toCartLine);
  const before =
    amount ?? cartLines.reduce((sum, l) => sum + getCartLinePrice(l), 0);
  const total = amount ?? getCartTotalWithGlobalPromotion(cartLines, globalPromotion);
  const paid = payments ?? [{ method: "cash", amount: total }];
  const createdAt = new Date(at);

  const sale = await SalesTransaction.create({
    transactionType: "sell",
    status,
    total_amount_before_promotion: before,
    total_amount: total,
    payment_method: paid.length === 1 ? paid[0].method : "mixed",
    payment_amount: paid.reduce((sum, p) => sum + p.amount, 0),
    customer_postal_code: postalCode,
    cash_session_id: session.id,
    createdAt,
    updatedAt: createdAt,
  });
  if (globalPromotion) {
    await TransactionGlobalPromotion.create({
      transaction_id: sale.id,
      type: globalPromotion.type,
      value: globalPromotion.value,
    });
  }

  const items = [];
  for (const [index, line] of lines.entries()) {
    const item = await LabeledItem.create({
      category_id: line.category.id,
      subcategory_id: line.subcategory?.id ?? null,
      price: line.price,
      weight: 0,
      status: "sold",
    });
    await TransactionItem.create({
      transaction_id: sale.id,
      labeled_item_id: item.id,
      name: `line-${index}`,
      ...toTransactionItemLine(cartLines[index]),
    });
    items.push(item);
  }
  for (const payment of paid) {
    await TransactionPayment.create({
      sales_transaction_id: sale.id,
      method: payment.method,
      amount: payment.amount,
    });
  }
  return { sale, items };
}

/**
 * A `sell` with no lines, as the Gift card page writes for a top-up. Not a
 * Sale for the analytics.
 * @param {{ id: number }} session
 * @param {{ at: string | Date, amount: number, status?: "completed" | "pending" | "cancelled" }} opts
 */
export async function recordLinelessSell(session, { at, amount, status = "completed" }) {
  const createdAt = new Date(at);
  return SalesTransaction.create({
    transactionType: "sell",
    status,
    total_amount_before_promotion: amount,
    total_amount: amount,
    payment_method: "cash",
    payment_amount: amount,
    cash_session_id: session.id,
    createdAt,
    updatedAt: createdAt,
  });
}

/**
 * A Refund of some lines of `sale`, at instant `at`, in `session` (the Store
 * where it is paid out). The amount is what `createRefund` pays: line value
 * minus the line's share of the whole-transaction discount.
 * @param {{ id: number }} session
 * @param {{
 *   at: string | Date,
 *   sale: import("../../src/models/salestransaction.js").default,
 *   lines: { item: { id: number }, quantity?: number }[],
 *   status?: "completed" | "pending" | "cancelled",
 *   method?: string,
 * }} opts
 */
export async function recordRefund(
  session,
  { at, sale, lines, status = "completed", method = "cash" },
) {
  const before = Number(sale.total_amount_before_promotion);
  const discount = before - Number(sale.total_amount);
  const refundLines = [];
  for (const line of lines) {
    const sold = await TransactionItem.findOne({
      where: { transaction_id: sale.id, labeled_item_id: line.item.id },
    });
    const cartLine = {
      price: Number(sold.price),
      quantity: line.quantity ?? 1,
      promotion: Number(sold.promotionValue ?? 0),
      bundleQuantity: sold.bundleQuantity,
      bundlePrice: sold.bundlePrice == null ? null : Number(sold.bundlePrice),
    };
    const gross = getCartLinePrice(cartLine);
    const amount = before > 0 ? gross - discount * (gross / before) : 0;
    refundLines.push({ item: line.item, cartLine, amount });
  }
  const total = refundLines.reduce((sum, l) => sum + l.amount, 0);
  const createdAt = new Date(at);

  const refund = await SalesTransaction.create({
    transactionType: "refund",
    status,
    total_amount_before_promotion: total,
    total_amount: total,
    payment_method: method,
    payment_amount: total,
    transactionId: sale.id,
    cash_session_id: session.id,
    createdAt,
    updatedAt: createdAt,
  });
  for (const [index, line] of refundLines.entries()) {
    await TransactionItem.create({
      transaction_id: refund.id,
      labeled_item_id: line.item.id,
      name: `refund-line-${index}`,
      ...toTransactionItemLine(line.cartLine),
    });
  }
  await TransactionPayment.create({
    sales_transaction_id: refund.id,
    method,
    amount: total,
  });
  return { refund };
}
