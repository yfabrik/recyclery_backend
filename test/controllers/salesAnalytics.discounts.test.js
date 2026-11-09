import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../src/middlewares/errorHandler";
import { router } from "../../src/v1/routes/salesTransactions";
import {
  createCategory,
  createStore,
  recordRefund,
  recordSale,
} from "../fixtures/salesAnalytics.js";

const app = express();
app.use("/sales-transactions", router);
app.use(errorHandler);

const getDiscounts = (query) =>
  request(app).get("/sales-transactions/analytics/discounts").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

/*
 * February 2024, compared by default with February 2023. Amounts are
 * before → after the whole-transaction discount.
 *
 * Orgelet
 *   5 Feb  Sale Vaisselle 50, 40 %                      50 → 30
 *   6 Feb  Sale Livres 20 + Verres (Vaisselle) 10, 5 €  30 → 25
 *   7 Feb  Sale Jouets 2 × 10 at −50 % (line)           list 20, 10
 *   8 Feb  Sale Livres 40, 5 % (Autres, not 5 €)        40 → 38
 *   9 Feb  Sale Vaisselle 15, no discount               15
 *  10 Feb  Sale Textile 30, Déco 20, Jardin 10, Outils 5, all −10 % (line): 58.5
 *  12 Feb  Refund of the 40 % Sale (30): reduces no discount
 *  13 Feb  pending 40 %, 14 Feb cancelled 5 € (not counted)
 * Lons
 *  29 Feb  Sale Vaisselle 100, 40 %                     100 → 60
 *  29 Feb 23:30 UTC = 1 Mar in Paris, 40 % (next month)
 *
 *  28 Feb 2023, Orgelet: Sale Livres 20, 40 %           20 → 12
 */
let orgelet;
let lons;
const categories = {};

beforeAll(async () => {
  for (const name of ["Vaisselle", "Livres", "Jouets", "Textile", "Déco", "Jardin", "Outils"]) {
    categories[name] = await createCategory({ name });
  }
  categories.Verres = await createCategory({
    name: "Verres",
    parent_id: categories.Vaisselle.id,
  });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
  const line = (name, price, extra = {}) => ({ price, category: categories[name], ...extra });
  const percent = (value) => ({ type: "percent", value });
  const fixed = (value) => ({ type: "fixed", value });

  const { sale: fortyPercent, items } = await recordSale(orgelet.session, {
    at: "2024-02-05T10:00:00Z",
    lines: [line("Vaisselle", 50)],
    globalPromotion: percent(40),
  });
  await recordSale(orgelet.session, {
    at: "2024-02-06T10:00:00Z",
    lines: [
      line("Livres", 20),
      line("Vaisselle", 10, { subcategory: categories.Verres }),
    ],
    globalPromotion: fixed(5),
  });
  await recordSale(orgelet.session, {
    at: "2024-02-07T10:00:00Z",
    lines: [line("Jouets", 10, { quantity: 2, promotion: 50 })],
  });
  await recordSale(orgelet.session, {
    at: "2024-02-08T10:00:00Z",
    lines: [line("Livres", 40)],
    globalPromotion: percent(5),
  });
  await recordSale(orgelet.session, {
    at: "2024-02-09T10:00:00Z",
    lines: [line("Vaisselle", 15)],
  });
  await recordSale(orgelet.session, {
    at: "2024-02-10T10:00:00Z",
    lines: [
      line("Textile", 30, { promotion: 10 }),
      line("Déco", 20, { promotion: 10 }),
      line("Jardin", 10, { promotion: 10 }),
      line("Outils", 5, { promotion: 10 }),
    ],
  });
  await recordRefund(orgelet.session, {
    at: "2024-02-12T10:00:00Z",
    sale: fortyPercent,
    lines: [{ item: items[0] }],
  });
  await recordSale(orgelet.session, {
    at: "2024-02-13T10:00:00Z",
    lines: [line("Vaisselle", 100)],
    globalPromotion: percent(40),
    status: "pending",
  });
  await recordSale(orgelet.session, {
    at: "2024-02-14T10:00:00Z",
    lines: [line("Vaisselle", 100)],
    globalPromotion: fixed(5),
    status: "cancelled",
  });

  await recordSale(lons.session, {
    at: "2024-02-29T10:00:00Z",
    lines: [line("Vaisselle", 100)],
    globalPromotion: percent(40),
  });
  await recordSale(lons.session, {
    at: "2024-02-29T23:30:00Z",
    lines: [line("Vaisselle", 100)],
    globalPromotion: percent(40),
  });

  await recordSale(orgelet.session, {
    at: "2023-02-28T13:00:00Z",
    lines: [line("Livres", 20)],
    globalPromotion: percent(40),
  });
});

describe("GET /sales-transactions/analytics/discounts totals", () => {
  it("splits the discount given on Sales into Category promotions and whole-transaction discounts, as a share of gross revenue", async () => {
    const res = await getDiscounts(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current).toMatchObject({
      sales_count: 7,
      gross_revenue: 236.5,
      category_promotion_discount: 16.5,
      whole_transaction_discount: 67,
      total_discount: 83.5,
    });
    expect(res.body.data.current.share_of_gross_revenue).toBeCloseTo(83.5 / 236.5, 6);
  });
});

describe("GET /sales-transactions/analytics/discounts top categories", () => {
  it("ranks the 5 top-level categories that got the most discount, whole-transaction discounts shared pro rata to line value", async () => {
    const res = await getDiscounts(FEB_2024);

    // Vaisselle: 20 (40 %) + 10/30 of 5 € (Verres) + 40 (Lons 40 %).
    // Livres: 20/30 of 5 € + 2 (5 %). Jardin (1) and Outils (0.5) are cut.
    expect(res.body.data.current.top_categories).toEqual([
      {
        category_id: categories.Vaisselle.id,
        name: "Vaisselle",
        discount: 61.67,
        category_promotion_discount: 0,
        whole_transaction_discount: 61.67,
      },
      {
        category_id: categories.Jouets.id,
        name: "Jouets",
        discount: 10,
        category_promotion_discount: 10,
        whole_transaction_discount: 0,
      },
      {
        category_id: categories.Livres.id,
        name: "Livres",
        discount: 5.33,
        category_promotion_discount: 0,
        whole_transaction_discount: 5.33,
      },
      {
        category_id: categories.Textile.id,
        name: "Textile",
        discount: 3,
        category_promotion_discount: 3,
        whole_transaction_discount: 0,
      },
      {
        category_id: categories["Déco"].id,
        name: "Déco",
        discount: 2,
        category_promotion_discount: 2,
        whole_transaction_discount: 0,
      },
    ]);
  });
});

describe("GET /sales-transactions/analytics/discounts notable discounts", () => {
  it("details the 40 % and 5 € discounts, every other whole-transaction discount under Autres", async () => {
    const res = await getDiscounts(FEB_2024);

    const groups = res.body.data.current.whole_transaction_discounts;
    expect(groups.map((g) => [g.key, g.label])).toEqual([
      ["percent-40", "40 %"],
      ["fixed-5", "5 €"],
      ["other", "Autres"],
    ]);
    // 40 %: 50 → 30 at Orgelet and 100 → 60 at Lons; the Refund of the first changes nothing.
    expect(groups[0]).toMatchObject({
      sales_count: 2,
      discount_amount: 60,
      average_basket_before: 75,
      average_basket_after: 45,
    });
    expect(groups[1]).toMatchObject({
      sales_count: 1,
      discount_amount: 5,
      average_basket_before: 30,
      average_basket_after: 25,
    });
    // 5 % is not 5 €.
    expect(groups[2]).toMatchObject({
      sales_count: 1,
      discount_amount: 2,
      average_basket_before: 40,
      average_basket_after: 38,
    });
    expect(groups.map((g) => g.share_of_sales)).toEqual([
      expect.closeTo(2 / 7, 6),
      expect.closeTo(1 / 7, 6),
      expect.closeTo(1 / 7, 6),
    ]);
  });
});

describe("GET /sales-transactions/analytics/discounts by Store", () => {
  it("splits each notable discount by Store when no Store is selected", async () => {
    const res = await getDiscounts(FEB_2024);

    const [fortyPercent, fiveEuros, others] = res.body.data.current.whole_transaction_discounts;
    expect(fortyPercent.by_store).toEqual([
      {
        store_id: lons.store.id,
        store_name: "Lons",
        sales_count: 1,
        discount_amount: 40,
        average_basket_before: 100,
        average_basket_after: 60,
      },
      {
        store_id: orgelet.store.id,
        store_name: "Orgelet",
        sales_count: 1,
        discount_amount: 20,
        average_basket_before: 50,
        average_basket_after: 30,
      },
    ]);
    expect(fiveEuros.by_store).toEqual([
      {
        store_id: orgelet.store.id,
        store_name: "Orgelet",
        sales_count: 1,
        discount_amount: 5,
        average_basket_before: 30,
        average_basket_after: 25,
      },
    ]);
    expect(others.by_store).toHaveLength(1);
  });

  it("counts only the chosen Store's Sales, with no split, and its Refunds reduce nothing", async () => {
    const res = await getDiscounts({ ...FEB_2024, store_id: orgelet.store.id });

    const current = res.body.data.current;
    expect(current).toMatchObject({
      sales_count: 6,
      gross_revenue: 176.5,
      category_promotion_discount: 16.5,
      whole_transaction_discount: 27,
      total_discount: 43.5,
    });
    expect(current.whole_transaction_discounts[0]).toMatchObject({
      sales_count: 1,
      share_of_sales: expect.closeTo(1 / 6, 6),
      discount_amount: 20,
      average_basket_before: 50,
      average_basket_after: 30,
      by_store: null,
    });
    expect(current.whole_transaction_discounts.map((g) => g.by_store)).toEqual([
      null,
      null,
      null,
    ]);
    expect(current.top_categories[0]).toMatchObject({
      name: "Vaisselle",
      whole_transaction_discount: 21.67,
    });
  });
});

describe("GET /sales-transactions/analytics/discounts comparison", () => {
  it("gives the same figures for February last year, every group present even with no Sale", async () => {
    const res = await getDiscounts(FEB_2024);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2023-02-01",
      date_to: "2023-02-28",
    });
    const comparison = res.body.data.comparison;
    expect(comparison).toMatchObject({
      sales_count: 1,
      gross_revenue: 12,
      category_promotion_discount: 0,
      whole_transaction_discount: 8,
      total_discount: 8,
      top_categories: [
        {
          category_id: categories.Livres.id,
          name: "Livres",
          discount: 8,
          category_promotion_discount: 0,
          whole_transaction_discount: 8,
        },
      ],
    });
    expect(comparison.whole_transaction_discounts).toEqual([
      {
        key: "percent-40",
        label: "40 %",
        sales_count: 1,
        share_of_sales: 1,
        discount_amount: 8,
        average_basket_before: 20,
        average_basket_after: 12,
        by_store: [
          {
            store_id: orgelet.store.id,
            store_name: "Orgelet",
            sales_count: 1,
            discount_amount: 8,
            average_basket_before: 20,
            average_basket_after: 12,
          },
        ],
      },
      {
        key: "fixed-5",
        label: "5 €",
        sales_count: 0,
        share_of_sales: 0,
        discount_amount: 0,
        average_basket_before: 0,
        average_basket_after: 0,
        by_store: [],
      },
      {
        key: "other",
        label: "Autres",
        sales_count: 0,
        share_of_sales: 0,
        discount_amount: 0,
        average_basket_before: 0,
        average_basket_after: 0,
        by_store: [],
      },
    ]);
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getDiscounts({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });

  it("refuses date_from after date_to with a 400", async () => {
    const res = await getDiscounts({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
  });
});
