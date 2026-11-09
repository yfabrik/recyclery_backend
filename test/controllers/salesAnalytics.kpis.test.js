import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../src/middlewares/errorHandler";
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

const getKpis = (query) =>
  request(app).get("/sales-transactions/analytics/kpis").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

/*
 * February 2024, a leap month, compared by default with February 2023.
 *
 * Orgelet                                    Lons
 *   1 Feb 00:30 Paris  Sale  8 (1 line)        29 Feb  Sale 30 (1 + 3 items)
 *   5 Feb             Sale 20 (2 items)        29 Feb  Refund 5 (1 item)
 *   5 Feb             Sale 27 (30 − 10 %)
 *   6 Feb  pending    100 (not counted)
 *   7 Feb  cancelled  200 (not counted)
 *   8 Feb  pending Refund 4 (not counted)
 *   9 Feb  gift card top-up 25, no lines (not a Sale)
 *  12 Feb             Refund 10 (1 item)
 *   1 Mar 00:30 Paris  Sale 50 (next month)
 *
 *  28 Feb 2023        Sale 40
 */
let orgelet;
let lons;

beforeAll(async () => {
  const category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
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
  await recordRefund(orgelet.session, {
    at: "2024-02-08T10:00:00Z",
    sale: twoItems,
    lines: [{ item: items[0], quantity: 1 }],
    status: "pending",
  });
  await recordLinelessSell(orgelet.session, { at: "2024-02-09T10:00:00Z", amount: 25 });
  await recordRefund(orgelet.session, {
    at: "2024-02-12T10:00:00Z",
    sale: twoItems,
    lines: [{ item: items[0], quantity: 1 }],
  });
  // 23:30 UTC on 29 Feb is 00:30 on 1 Mar in Paris.
  await recordSale(orgelet.session, { at: "2024-02-29T23:30:00Z", lines: [line(50)] });

  const { sale: lonsSale, items: lonsItems } = await recordSale(lons.session, {
    at: "2024-02-29T10:00:00Z",
    lines: [line(15), line(5, 3)],
  });
  await recordRefund(lons.session, {
    at: "2024-02-29T15:00:00Z",
    sale: lonsSale,
    lines: [{ item: lonsItems[1], quantity: 1 }],
  });

  await recordSale(orgelet.session, { at: "2023-02-28T13:00:00Z", lines: [line(40)] });
});

describe("GET /sales-transactions/analytics/kpis", () => {
  it("returns the KPIs of completed Sales and Refunds in the Paris-time range, lineless sells excluded", async () => {
    const res = await getKpis(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current).toEqual({
      gross_revenue: 85,
      refunded_amount: 15,
      net_revenue: 70,
      refund_count: 2,
      sales_count: 4,
      average_basket: 21.25,
      items_sold: 6,
      opening_days: 3,
      revenue_per_opening_day: 23.33,
    });
  });
});

describe("GET /sales-transactions/analytics/kpis comparison", () => {
  it("compares with the same days last year by default, 29 Feb mapping to 28 Feb", async () => {
    const res = await getKpis(FEB_2024);

    expect(res.body.data.ranges).toEqual({
      current: { date_from: "2024-02-01", date_to: "2024-02-29" },
      comparison: { date_from: "2023-02-01", date_to: "2023-02-28" },
    });
    expect(res.body.data.comparison).toEqual({
      gross_revenue: 40,
      refunded_amount: 0,
      net_revenue: 40,
      refund_count: 0,
      sales_count: 1,
      average_basket: 40,
      items_sold: 1,
      opening_days: 1,
      revenue_per_opening_day: 40,
    });
  });

  it("compares a whole month with the whole month before on compare=previous", async () => {
    const res = await getKpis({ ...FEB_2024, compare: "previous" });

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2024-01-01",
      date_to: "2024-01-31",
    });
    // The Sale at 23:30 UTC on 31 Jan is on 1 Feb in Paris, so January is empty.
    expect(res.body.data.comparison).toMatchObject({
      gross_revenue: 0,
      sales_count: 0,
      average_basket: 0,
      opening_days: 0,
      revenue_per_opening_day: 0,
    });
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getKpis({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.ranges.comparison).toBeNull();
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/kpis Store scope", () => {
  it("counts only the chosen Store's Sales and Refunds", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getKpis({ ...FEB_2024, store_id: orgelet.store.id }),
      getKpis({ ...FEB_2024, store_id: lons.store.id }),
    ]);

    expect(orgeletRes.body.data.current).toEqual({
      gross_revenue: 55,
      refunded_amount: 10,
      net_revenue: 45,
      refund_count: 1,
      sales_count: 3,
      average_basket: 18.33,
      items_sold: 3,
      opening_days: 2,
      revenue_per_opening_day: 22.5,
    });
    expect(lonsRes.body.data.current).toEqual({
      gross_revenue: 30,
      refunded_amount: 5,
      net_revenue: 25,
      refund_count: 1,
      sales_count: 1,
      average_basket: 30,
      items_sold: 3,
      opening_days: 1,
      revenue_per_opening_day: 25,
    });
    expect(lonsRes.body.data.comparison.sales_count).toBe(0);
  });
});

describe("GET /sales-transactions/analytics/kpis validation", () => {
  it("refuses date_from after date_to with a 400", async () => {
    const res = await getKpis({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("refuses a missing date with a 400", async () => {
    const res = await getKpis({ date_to: "2024-02-01" });

    expect(res.status).toBe(400);
  });
});
