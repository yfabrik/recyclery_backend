import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../src/middlewares/errorHandler";
import db from "../../src/models/index";
import { router } from "../../src/v1/routes/salesTransactions";
import {
  createCategory,
  createStore,
  recordLinelessSell,
  recordRefund,
  recordSale,
} from "../fixtures/salesAnalytics.js";

const app = express();
app.use("/sales-transactions", router);
app.use(errorHandler);

const getCategories = (query) =>
  request(app).get("/sales-transactions/analytics/categories").query(query);
const getKpis = (query) =>
  request(app).get("/sales-transactions/analytics/kpis").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

/*
 * February 2024, compared by default with February 2023.
 *
 * Categories: Vaisselle > Assiettes > Assiettes plates, Vaisselle > Verres,
 * Textile, and Disparue, whose row is deleted after the Sales (its items have
 * no category any more).
 *
 * Orgelet
 *   1 Feb 00:30 Paris  Sale  8: Textile 8
 *   5 Feb              Sale 54 = 60 − 10 %: Vaisselle itself 20, Assiettes plates 2 × 5, Verres 30
 *                      (net per line after the discount: 18, 9, 27)
 *   6 Feb  pending     Textile 100 (not counted)
 *   7 Feb  cancelled   Vaisselle 200 (not counted)
 *   9 Feb              gift card top-up 25, no lines (not a Sale)
 *  12 Feb              Refund of 1 Assiettes plates: 5 − 10 % = 4.5
 *   1 Mar 00:30 Paris  Sale 50: Textile (next month)
 * Lons
 *  29 Feb              Sale 30: Disparue 15, Textile 3 × 5
 *  29 Feb              Refund of 1 Textile: 5
 *
 * 28 Feb 2023 (Orgelet) Sale 40: Verres
 *
 * Net revenue 82.5 = Vaisselle 49.5 (18 + 9 − 4.5 + 27) + Textile 18 (8 + 15 − 5)
 * + Sans catégorie 15.
 */
let orgelet;
let lons;
let vaisselle;
let assiettes;
let verres;
let textile;

beforeAll(async () => {
  vaisselle = await createCategory({ name: "Vaisselle" });
  assiettes = await createCategory({ name: "Assiettes", parent_id: vaisselle.id });
  const plates = await createCategory({ name: "Assiettes plates", parent_id: assiettes.id });
  verres = await createCategory({ name: "Verres", parent_id: vaisselle.id });
  textile = await createCategory({ name: "Textile" });
  const disparue = await createCategory({ name: "Disparue" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");

  await recordSale(orgelet.session, {
    at: "2024-01-31T23:30:00Z",
    lines: [{ price: 8, category: textile }],
  });
  const { sale: discounted, items } = await recordSale(orgelet.session, {
    at: "2024-02-05T09:00:00Z",
    lines: [
      { price: 20, category: vaisselle },
      { price: 5, quantity: 2, category: vaisselle, subcategory: plates },
      { price: 30, category: vaisselle, subcategory: verres },
    ],
    globalPromotion: { type: "percent", value: 10 },
  });
  await recordSale(orgelet.session, {
    at: "2024-02-06T10:00:00Z",
    lines: [{ price: 100, category: textile }],
    status: "pending",
  });
  await recordSale(orgelet.session, {
    at: "2024-02-07T10:00:00Z",
    lines: [{ price: 200, category: vaisselle }],
    status: "cancelled",
  });
  await recordLinelessSell(orgelet.session, { at: "2024-02-09T10:00:00Z", amount: 25 });
  await recordRefund(orgelet.session, {
    at: "2024-02-12T10:00:00Z",
    sale: discounted,
    lines: [{ item: items[1], quantity: 1 }],
  });
  await recordSale(orgelet.session, {
    at: "2024-02-29T23:30:00Z",
    lines: [{ price: 50, category: textile }],
  });

  const { sale: lonsSale, items: lonsItems } = await recordSale(lons.session, {
    at: "2024-02-29T10:00:00Z",
    lines: [
      { price: 15, category: disparue },
      { price: 5, quantity: 3, category: textile },
    ],
  });
  await recordRefund(lons.session, {
    at: "2024-02-29T15:00:00Z",
    sale: lonsSale,
    lines: [{ item: lonsItems[1], quantity: 1 }],
  });

  await recordSale(orgelet.session, {
    at: "2023-02-28T13:00:00Z",
    lines: [{ price: 40, category: vaisselle, subcategory: verres }],
  });

  // A Category row gone missing: its items have no category any more.
  await db.sequelize.query("PRAGMA foreign_keys = OFF");
  await db.sequelize.query("DELETE FROM `Categories` WHERE `id` = ?", {
    replacements: [disparue.id],
  });
  await db.sequelize.query("PRAGMA foreign_keys = ON");
});

const cents = (amount) => Math.round(amount * 100);

describe("GET /sales-transactions/analytics/categories", () => {
  it("rolls Sale and Refund lines up to their top-level category, whole-transaction discounts shared pro rata", async () => {
    const res = await getCategories(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current).toEqual({
      path: [],
      net_revenue: 82.5,
      quantity: 7,
      categories: [
        {
          category_id: vaisselle.id,
          name: "Vaisselle",
          has_subcategories: true,
          net_revenue: 49.5,
          quantity: 3,
          share: 0.6,
          average_price: 16.5,
        },
        {
          category_id: textile.id,
          name: "Textile",
          has_subcategories: false,
          net_revenue: 18,
          quantity: 3,
          share: 0.2182,
          average_price: 6,
        },
        {
          category_id: null,
          name: "Sans catégorie",
          has_subcategories: false,
          net_revenue: 15,
          quantity: 1,
          share: 0.1818,
          average_price: 15,
        },
      ],
    });
  });

  it("adds up to the KPI net revenue and items sold", async () => {
    const [categories, kpis] = await Promise.all([
      getCategories(FEB_2024),
      getKpis(FEB_2024),
    ]);
    const rows = categories.body.data.current.categories;

    expect(rows.reduce((sum, r) => sum + cents(r.net_revenue), 0)).toBe(
      cents(kpis.body.data.current.net_revenue),
    );
    expect(rows.reduce((sum, r) => sum + r.quantity, 0)).toBe(
      kpis.body.data.current.items_sold,
    );
  });
});

describe("GET /sales-transactions/analytics/categories comparison", () => {
  it("gives the same figures for the comparison range, 29 Feb mapping to 28 Feb", async () => {
    const res = await getCategories(FEB_2024);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2023-02-01",
      date_to: "2023-02-28",
    });
    expect(res.body.data.comparison).toEqual({
      path: [],
      net_revenue: 40,
      quantity: 1,
      categories: [
        {
          category_id: vaisselle.id,
          name: "Vaisselle",
          has_subcategories: true,
          net_revenue: 40,
          quantity: 1,
          share: 1,
          average_price: 40,
        },
      ],
    });
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getCategories({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/categories?parent_id", () => {
  it("lists the category's direct children, everything under them included, plus the items attached directly to it", async () => {
    const res = await getCategories({ ...FEB_2024, parent_id: vaisselle.id });

    expect(res.status).toBe(200);
    expect(res.body.data.current).toEqual({
      path: [{ id: vaisselle.id, name: "Vaisselle" }],
      net_revenue: 49.5,
      quantity: 3,
      categories: [
        {
          category_id: verres.id,
          name: "Verres",
          has_subcategories: false,
          net_revenue: 27,
          quantity: 1,
          share: 0.5455,
          average_price: 27,
        },
        {
          category_id: vaisselle.id,
          name: "Vaisselle (sans sous-catégorie)",
          has_subcategories: false,
          net_revenue: 18,
          quantity: 1,
          share: 0.3636,
          average_price: 18,
        },
        {
          category_id: assiettes.id,
          name: "Assiettes",
          has_subcategories: true,
          net_revenue: 4.5,
          quantity: 1,
          share: 0.0909,
          average_price: 4.5,
        },
      ],
    });
    expect(res.body.data.comparison.categories).toEqual([
      expect.objectContaining({ category_id: verres.id, net_revenue: 40, quantity: 1 }),
    ]);
  });

  it("opens a subcategory the same way, its Refund lines subtracted in revenue and quantity", async () => {
    const res = await getCategories({ ...FEB_2024, parent_id: assiettes.id });

    expect(res.body.data.current.path).toEqual([
      { id: vaisselle.id, name: "Vaisselle" },
      { id: assiettes.id, name: "Assiettes" },
    ]);
    // Sold 2 × 5 − 10 % = 9, refunded 1 at 4.5.
    expect(res.body.data.current.categories).toEqual([
      {
        category_id: expect.any(Number),
        name: "Assiettes plates",
        has_subcategories: false,
        net_revenue: 4.5,
        quantity: 1,
        share: 1,
        average_price: 4.5,
      },
    ]);
  });

  it("answers 404 for an unknown category", async () => {
    const res = await getCategories({ ...FEB_2024, parent_id: 999999 });

    expect(res.status).toBe(404);
  });

  it("refuses an invalid parent_id with a 400", async () => {
    const res = await getCategories({ ...FEB_2024, parent_id: "abc" });

    expect(res.status).toBe(400);
  });
});

describe("GET /sales-transactions/analytics/categories Store scope", () => {
  it("counts only the chosen Store's lines, Refunds in the Store where they were paid out", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getCategories({ ...FEB_2024, store_id: orgelet.store.id }),
      getCategories({ ...FEB_2024, store_id: lons.store.id }),
    ]);

    const figures = (res) =>
      res.body.data.current.categories.map(({ name, net_revenue, quantity }) => ({
        name,
        net_revenue,
        quantity,
      }));
    expect(figures(orgeletRes)).toEqual([
      { name: "Vaisselle", net_revenue: 49.5, quantity: 3 },
      { name: "Textile", net_revenue: 8, quantity: 1 },
    ]);
    expect(figures(lonsRes)).toEqual([
      { name: "Sans catégorie", net_revenue: 15, quantity: 1 },
      { name: "Textile", net_revenue: 10, quantity: 2 },
    ]);
  });
});

describe("GET /sales-transactions/analytics/categories rounding", () => {
  const APRIL_2024 = { date_from: "2024-04-01", date_to: "2024-04-30", compare: "none" };

  beforeAll(async () => {
    // 30 − 5 € shared over three categories: 8.333… each.
    const livres = await createCategory({ name: "Livres" });
    await recordSale(orgelet.session, {
      at: "2024-04-10T10:00:00Z",
      lines: [
        { price: 10, category: vaisselle },
        { price: 10, category: textile },
        { price: 10, category: livres },
      ],
      globalPromotion: { type: "fixed", value: 5 },
    });
  });

  it("rounds categories to the cent so that they still add up to net revenue", async () => {
    const [categories, kpis] = await Promise.all([
      getCategories(APRIL_2024),
      getKpis(APRIL_2024),
    ]);
    const rows = categories.body.data.current.categories;

    expect(rows.map((r) => r.net_revenue).sort()).toEqual([8.33, 8.33, 8.34]);
    expect(rows.reduce((sum, r) => sum + cents(r.net_revenue), 0)).toBe(
      cents(kpis.body.data.current.net_revenue),
    );
    expect(categories.body.data.current.net_revenue).toBe(25);
  });
});
