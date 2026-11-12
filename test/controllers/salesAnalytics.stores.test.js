import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../src/middlewares/errorHandler";
import { router } from "../../src/v1/routes/salesTransactions";
import { createRecyclery } from "../models/helpers.js";
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

const getStores = (query) =>
  request(app).get("/sales-transactions/analytics/stores").query(query);
const getKpis = (query) =>
  request(app).get("/sales-transactions/analytics/kpis").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

/*
 * February 2024, compared by default with February 2023.
 *
 * Orgelet                                     Lons
 *   1 Feb 00:30 Paris  Sale  8                  29 Feb  Sale 30 (1 + 3 items)
 *   5 Feb             Sale 20 (2 items)         29 Feb  Refund 10 of Orgelet's 5 Feb Sale
 *   5 Feb             Sale 27 (30 − 10 %)
 *   6 Feb  pending    100 (not counted)       Clairvaux (closed since, inactive)
 *   7 Feb  cancelled  200 (not counted)         14 Feb  Sale 15
 *   9 Feb  gift card top-up 25, no lines
 *  12 Feb             Refund 10 (1 item)      Champagnole (active): nothing
 *   1 Mar 00:30 Paris  Sale 50 (next month)   Morez (inactive): nothing
 *
 *  28 Feb 2023        Sale 40                   10 Feb 2023  Sale 10
 */
let orgelet;
let lons;
let clairvaux;
let champagnole;

beforeAll(async () => {
  const category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
  clairvaux = await createStore("Clairvaux");
  champagnole = await createStore("Champagnole");
  await createRecyclery({ name: "Morez", is_active: false });
  const line = (price, quantity = 1) => ({ price, quantity, category });

  // 23:30 UTC on 31 Jan is 00:30 on 1 Feb in Paris.
  await recordSale(orgelet.session, { at: "2024-01-31T23:30:00Z", lines: [line(8)] });
  const { sale: twoItems, items } = await recordSale(orgelet.session, {
    at: "2024-02-05T09:00:00Z",
    lines: [line(10, 2)],
  });
  await recordSale(orgelet.session, {
    at: "2024-02-05T14:00:00Z",
    lines: [line(30)],
    globalPromotion: { type: "percent", value: 10 },
  });
  await recordSale(orgelet.session, {
    at: "2024-02-06T10:00:00Z",
    lines: [line(100)],
    status: "pending",
  });
  await recordSale(orgelet.session, {
    at: "2024-02-07T10:00:00Z",
    lines: [line(200)],
    status: "cancelled",
  });
  await recordLinelessSell(orgelet.session, { at: "2024-02-09T10:00:00Z", amount: 25 });
  await recordRefund(orgelet.session, {
    at: "2024-02-12T10:00:00Z",
    sale: twoItems,
    lines: [{ item: items[0], quantity: 1 }],
  });
  // 23:30 UTC on 29 Feb is 00:30 on 1 Mar in Paris.
  await recordSale(orgelet.session, { at: "2024-02-29T23:30:00Z", lines: [line(50)] });

  await recordSale(lons.session, {
    at: "2024-02-29T10:00:00Z",
    lines: [line(15), line(5, 3)],
  });
  // Paid out at Lons: a Refund belongs to its own cash session's Store.
  await recordRefund(lons.session, {
    at: "2024-02-29T15:00:00Z",
    sale: twoItems,
    lines: [{ item: items[0], quantity: 1 }],
  });

  await recordSale(clairvaux.session, { at: "2024-02-14T10:00:00Z", lines: [line(15)] });
  await clairvaux.store.update({ is_active: false });

  await recordSale(orgelet.session, { at: "2023-02-28T13:00:00Z", lines: [line(40)] });
  await recordSale(lons.session, { at: "2023-02-10T13:00:00Z", lines: [line(10)] });
});

const row = (store, figures) => ({
  store_id: store.store.id,
  name: store.store.name,
  ...figures,
});

const ZERO = {
  net_revenue: 0,
  gross_revenue: 0,
  refunded_amount: 0,
  sales_count: 0,
  refund_count: 0,
  average_basket: 0,
  net_revenue_share: 0,
};

describe("GET /sales-transactions/analytics/stores", () => {
  it("returns one row per Store, by net revenue, with an active Store's zero row and an inactive Store only when it sold", async () => {
    const res = await getStores(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current.stores).toEqual([
      row(orgelet, {
        is_active: true,
        net_revenue: 45,
        gross_revenue: 55,
        refunded_amount: 10,
        sales_count: 3,
        refund_count: 1,
        average_basket: 18.33,
        net_revenue_share: 0.5625,
      }),
      row(lons, {
        is_active: true,
        net_revenue: 20,
        gross_revenue: 30,
        refunded_amount: 10,
        sales_count: 1,
        refund_count: 1,
        average_basket: 30,
        net_revenue_share: 0.25,
      }),
      row(clairvaux, {
        is_active: false,
        net_revenue: 15,
        gross_revenue: 15,
        refunded_amount: 0,
        sales_count: 1,
        refund_count: 0,
        average_basket: 15,
        net_revenue_share: 0.1875,
      }),
      row(champagnole, { is_active: true, ...ZERO }),
    ]);
  });
});

const sumRows = (stores) =>
  stores.reduce(
    (total, store) => ({
      net_revenue: total.net_revenue + store.net_revenue,
      gross_revenue: total.gross_revenue + store.gross_revenue,
      refunded_amount: total.refunded_amount + store.refunded_amount,
      sales_count: total.sales_count + store.sales_count,
      refund_count: total.refund_count + store.refund_count,
    }),
    { net_revenue: 0, gross_revenue: 0, refunded_amount: 0, sales_count: 0, refund_count: 0 },
  );

describe("GET /sales-transactions/analytics/stores totals", () => {
  it("adds up to the all-Stores KPIs, in the current and the comparison range", async () => {
    const [stores, kpis] = await Promise.all([getStores(FEB_2024), getKpis(FEB_2024)]);

    for (const range of ["current", "comparison"]) {
      const { net_revenue, gross_revenue, refunded_amount, sales_count, refund_count } =
        kpis.body.data[range];
      expect(sumRows(stores.body.data[range].stores)).toEqual({
        net_revenue,
        gross_revenue,
        refunded_amount,
        sales_count,
        refund_count,
      });
    }
    const shares = stores.body.data.current.stores.map((s) => s.net_revenue_share);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("GET /sales-transactions/analytics/stores comparison", () => {
  it("lists the same days last year by Store, without an inactive Store that sold nothing then", async () => {
    const res = await getStores(FEB_2024);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2023-02-01",
      date_to: "2023-02-28",
    });
    expect(res.body.data.comparison.stores).toEqual([
      row(orgelet, {
        is_active: true,
        ...ZERO,
        net_revenue: 40,
        gross_revenue: 40,
        sales_count: 1,
        average_basket: 40,
        net_revenue_share: 0.8,
      }),
      row(lons, {
        is_active: true,
        ...ZERO,
        net_revenue: 10,
        gross_revenue: 10,
        sales_count: 1,
        average_basket: 10,
        net_revenue_share: 0.2,
      }),
      row(champagnole, { is_active: true, ...ZERO }),
    ]);
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getStores({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/stores Store scope", () => {
  it("lists only the chosen Store, through its cash sessions' registers", async () => {
    const res = await getStores({ ...FEB_2024, store_id: lons.store.id });

    expect(res.body.data.current.stores).toEqual([
      row(lons, {
        is_active: true,
        net_revenue: 20,
        gross_revenue: 30,
        refunded_amount: 10,
        sales_count: 1,
        refund_count: 1,
        average_basket: 30,
        net_revenue_share: 1,
      }),
    ]);
    expect(res.body.data.comparison.stores.map((s) => s.store_id)).toEqual([lons.store.id]);
  });

  it("gives a chosen active Store that sold nothing its zero row", async () => {
    const res = await getStores({ ...FEB_2024, store_id: champagnole.store.id });

    expect(res.body.data.current.stores).toEqual([row(champagnole, { is_active: true, ...ZERO })]);
  });
});

describe("GET /sales-transactions/analytics/stores validation", () => {
  it("refuses date_from after date_to with a 400", async () => {
    const res = await getStores({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
