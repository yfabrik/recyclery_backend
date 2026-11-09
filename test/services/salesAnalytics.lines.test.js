import { beforeAll, describe, expect, it } from "@jest/globals";
import {
  categoryPath,
  itemsSold,
  loadCategoryTree,
  loadLines,
  loadTransactions,
  parisDayBounds,
  parisHour,
  sumLinesByCategory,
  sumTransactions,
} from "../../src/services/salesAnalytics/index";
import {
  createCategory,
  createStore,
  recordRefund,
  recordSale,
} from "../fixtures/salesAnalytics.js";

const MARCH = { date_from: "2026-03-01", date_to: "2026-03-31" };
const APRIL = { date_from: "2026-04-01", date_to: "2026-04-30" };
const scope = (storeId = null, range = MARCH) => ({
  bounds: parisDayBounds(range),
  storeId,
});

/*
 * One Sale with a 10 % whole-transaction discount:
 *   Vaisselle 30, Livres > Romans 10, and Jouets 20 with a 50 % Category promotion (10).
 *   Before discount 50, after 45.
 * One Refund of the Romans line: 10 − 10 % = 9.
 */
let store;
let vaisselle;
let livres;
let romans;
let jouets;

beforeAll(async () => {
  store = await createStore();
  const { session } = store;
  vaisselle = await createCategory({ name: "Vaisselle" });
  livres = await createCategory({ name: "Livres" });
  romans = await createCategory({ name: "Romans", parent_id: livres.id });
  jouets = await createCategory({ name: "Jouets" });

  const { sale, items } = await recordSale(session, {
    at: "2026-03-10T10:00:00Z",
    lines: [
      { price: 30, category: vaisselle },
      { price: 10, category: livres, subcategory: romans },
      { price: 20, category: jouets, promotion: 50 },
    ],
    globalPromotion: { type: "percent", value: 10 },
  });
  await recordRefund(session, {
    at: "2026-03-12T10:00:00Z",
    sale,
    lines: [{ item: items[1] }],
  });
});

const categoryTotals = async () => sumLinesByCategory(await loadLines(scope()));

describe("loadLines and sumLinesByCategory", () => {
  const find = (rows, category) => rows.find((r) => r.categoryId === category.id);

  it("shares the whole-transaction discount across lines pro rata to line value", async () => {
    const rows = await categoryTotals();

    expect(find(rows, vaisselle).sales).toEqual({
      quantity: 1,
      listValue: 30,
      value: 30,
      net: 27,
    });
    expect(find(rows, jouets).sales).toEqual({
      quantity: 1,
      listValue: 20,
      value: 10,
      net: 9,
    });
  });

  it("files a line under its most specific category, Refund lines included", async () => {
    const rows = await categoryTotals();

    expect(find(rows, livres)).toBeUndefined();
    expect(find(rows, romans)).toEqual({
      categoryId: romans.id,
      sales: { quantity: 1, listValue: 10, value: 10, net: 9 },
      refunds: { quantity: 1, listValue: 10, value: 10, net: 9 },
    });
  });

  it("adds up to net revenue", async () => {
    const [rows, totals] = await Promise.all([
      categoryTotals(),
      loadTransactions(scope()).then(sumTransactions),
    ]);
    const net = rows.reduce((sum, r) => sum + r.sales.net - r.refunds.net, 0);

    expect(net).toBeCloseTo(totals.sales.amount - totals.refunds.amount, 9);
    expect(net).toBeCloseTo(36, 9);
  });
});

describe("loadLines when a transaction's lines are worth 0", () => {
  it("shares its amount by quantity, so lines still add up to it", async () => {
    const { session } = await createStore();
    const category = await createCategory();
    const { sale } = await recordSale(session, {
      at: "2026-05-10T10:00:00Z",
      lines: [
        { price: 0, quantity: 1, category },
        { price: 0, quantity: 3, category },
      ],
      amount: 0.4,
    });

    const lines = await loadLines(scope(null, { date_from: "2026-05-01", date_to: "2026-05-31" }));
    const cents = (n) => Math.round(n * 100) / 100;
    expect(
      lines
        .filter((l) => l.transactionId === sale.id)
        .map((l) => [l.quantity, cents(l.net)])
        .sort(),
    ).toEqual([
      [1, 0.1],
      [3, 0.3],
    ]);
  });
});

describe("itemsSold", () => {
  it("is the quantity on Sale lines minus the quantity on Refund lines", async () => {
    expect(itemsSold(await loadLines(scope()))).toBe(2);
  });
});

describe("loadTransactions", () => {
  it("files a Refund under the Store where it was paid out, not the Sale's", async () => {
    const other = await createStore();
    const category = await createCategory();
    const { sale, items } = await recordSale(store.session, {
      at: "2026-04-20T10:00:00Z",
      lines: [{ price: 12, category }],
    });
    const { refund } = await recordRefund(other.session, {
      at: "2026-04-21T10:00:00Z",
      sale,
      lines: [{ item: items[0] }],
    });

    const [own, elsewhere] = await Promise.all([
      loadTransactions(scope(store.store.id, APRIL)),
      loadTransactions(scope(other.store.id, APRIL)),
    ]);
    expect(own.map((t) => t.id)).toEqual([sale.id]);
    expect(elsewhere).toEqual([
      expect.objectContaining({
        id: refund.id,
        kind: "refund",
        amount: 12,
        storeId: other.store.id,
        refundedSaleId: sale.id,
      }),
    ]);
  });
});

describe("parisHour", () => {
  it("reads the hour in Paris time, summer and winter", () => {
    expect(parisHour(new Date("2026-07-01T08:30:00Z"))).toBe(10);
    expect(parisHour(new Date("2026-01-15T08:30:00Z"))).toBe(9);
  });
});

describe("categoryPath", () => {
  it("follows parent_id up to the top-level category, whatever the depth", async () => {
    const poches = await createCategory({ name: "Poches", parent_id: romans.id });
    const tree = await loadCategoryTree();

    expect(categoryPath(tree, poches.id).map((c) => c.name)).toEqual([
      "Livres",
      "Romans",
      "Poches",
    ]);
    expect(categoryPath(tree, vaisselle.id).map((c) => c.name)).toEqual([
      "Vaisselle",
    ]);
  });

  it("is empty for no category", async () => {
    const tree = await loadCategoryTree();

    expect(categoryPath(tree, null)).toEqual([]);
  });
});
