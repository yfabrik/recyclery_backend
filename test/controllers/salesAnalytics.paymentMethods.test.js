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

const { TransactionPayment } = db;

const app = express();
app.use("/sales-transactions", router);
app.use(errorHandler);

const getPaymentMethods = (query) =>
  request(app).get("/sales-transactions/analytics/payment-methods").query(query);

const MARCH_2026 = { date_from: "2026-03-01", date_to: "2026-03-31", period: "month" };

/*
 * March 2026, compared by default with March 2025.
 *
 * Orgelet                                         Lons
 *   3 Mar  Sale 30: card 20 + cash 20 (10 change)   1 Mar 00:30 Paris  Sale 40: gift card 40
 *   4 Mar  Sale 15: cash 20 (5 change)              12 Mar  Refund 15 by check, no payment row
 *   5 Mar  Sale 15: card 15                                 (made before the payments table)
 *   6 Mar  pending Sale 100 (not counted)
 *   7 Mar  cancelled Sale 200 (not counted)
 *   8 Mar  gift card top-up 25, no lines (not a Sale)
 *  10 Mar  Refund 10 in cash
 *  11 Mar  pending Refund 20 (not counted)
 *
 *  12 Mar 2025  Sale 50 in cash
 *   2 Apr 2026  Sale 12 by card, no payment row (made before the payments table)
 */
let orgelet;
let lons;

beforeAll(async () => {
  const category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
  const line = (price) => ({ price, category });

  const { sale: mixedSale, items: mixedItems } = await recordSale(orgelet.session, {
    at: "2026-03-03T10:00:00Z",
    lines: [line(10), line(20)],
    payments: [
      { method: "card", amount: 20 },
      { method: "cash", amount: 20 },
    ],
  });
  await recordSale(orgelet.session, {
    at: "2026-03-04T10:00:00Z",
    lines: [line(15)],
    payments: [{ method: "cash", amount: 20 }],
  });
  await recordSale(orgelet.session, {
    at: "2026-03-05T10:00:00Z",
    lines: [line(15)],
    payments: [{ method: "card", amount: 15 }],
  });
  await recordSale(orgelet.session, {
    at: "2026-03-06T10:00:00Z",
    lines: [line(100)],
    status: "pending",
  });
  await recordSale(orgelet.session, {
    at: "2026-03-07T10:00:00Z",
    lines: [line(200)],
    payments: [{ method: "card", amount: 200 }],
    status: "cancelled",
  });
  await recordLinelessSell(orgelet.session, { at: "2026-03-08T10:00:00Z", amount: 25 });
  await recordRefund(orgelet.session, {
    at: "2026-03-10T10:00:00Z",
    sale: mixedSale,
    lines: [{ item: mixedItems[0] }],
    method: "cash",
  });
  await recordRefund(orgelet.session, {
    at: "2026-03-11T10:00:00Z",
    sale: mixedSale,
    lines: [{ item: mixedItems[1] }],
    status: "pending",
  });

  // 23:30 UTC on 28 Feb is 00:30 on 1 Mar in Paris.
  const { sale: lonsSale, items: lonsItems } = await recordSale(lons.session, {
    at: "2026-02-28T23:30:00Z",
    lines: [line(25), line(15)],
    payments: [{ method: "giftcard", amount: 40 }],
  });
  const { refund: oldRefund } = await recordRefund(lons.session, {
    at: "2026-03-12T10:00:00Z",
    sale: lonsSale,
    lines: [{ item: lonsItems[1] }],
    method: "check",
  });
  await TransactionPayment.destroy({ where: { sales_transaction_id: oldRefund.id } });

  await recordSale(orgelet.session, { at: "2025-03-12T10:00:00Z", lines: [line(50)] });

  const { sale: oldSale } = await recordSale(orgelet.session, {
    at: "2026-04-02T10:00:00Z",
    lines: [line(12)],
    payments: [{ method: "card", amount: 12 }],
  });
  await TransactionPayment.destroy({ where: { sales_transaction_id: oldSale.id } });
});

const salesColumns = ({ method, sales_amount, sales_share, payment_count }) => ({
  method,
  sales_amount,
  sales_share,
  payment_count,
});

describe("GET /sales-transactions/analytics/payment-methods", () => {
  it("splits the Sales total by the amount each method collected, cash without the change", async () => {
    const res = await getPaymentMethods(MARCH_2026);

    expect(res.status).toBe(200);
    const { current } = res.body.data;
    expect(current.sales_amount).toBe(100);
    expect(current.methods.map(salesColumns)).toEqual([
      { method: "giftcard", sales_amount: 40, sales_share: 0.4, payment_count: 1 },
      { method: "card", sales_amount: 35, sales_share: 0.35, payment_count: 2 },
      { method: "cash", sales_amount: 25, sales_share: 0.25, payment_count: 2 },
      { method: "check", sales_amount: 0, sales_share: 0, payment_count: 0 },
    ]);
  });

  it("puts what each Refund paid out on its method, an old Refund with no payment row on its payment_method", async () => {
    const res = await getPaymentMethods(MARCH_2026);

    const { current } = res.body.data;
    expect(current.refunded_amount).toBe(25);
    expect(
      current.methods.map(({ method, refunded_amount }) => ({ method, refunded_amount })),
    ).toEqual([
      { method: "giftcard", refunded_amount: 0 },
      { method: "card", refunded_amount: 0 },
      { method: "cash", refunded_amount: 10 },
      { method: "check", refunded_amount: 15 },
    ]);
  });
});

describe("GET /sales-transactions/analytics/payment-methods Store scope", () => {
  it("counts only the chosen Store's Sales and Refunds", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getPaymentMethods({ ...MARCH_2026, store_id: orgelet.store.id }),
      getPaymentMethods({ ...MARCH_2026, store_id: lons.store.id }),
    ]);

    expect(orgeletRes.body.data.current).toMatchObject({
      sales_amount: 60,
      refunded_amount: 10,
      methods: [
        { method: "card", sales_amount: 35, payment_count: 2, refunded_amount: 0 },
        { method: "cash", sales_amount: 25, payment_count: 2, refunded_amount: 10 },
      ],
    });
    expect(lonsRes.body.data.current).toEqual({
      sales_amount: 40,
      refunded_amount: 15,
      methods: [
        { method: "giftcard", sales_amount: 40, sales_share: 1, payment_count: 1, refunded_amount: 0 },
        { method: "check", sales_amount: 0, sales_share: 0, payment_count: 0, refunded_amount: 15 },
      ],
    });
  });
});

describe("GET /sales-transactions/analytics/payment-methods comparison", () => {
  it("compares with the same days last year by default", async () => {
    const res = await getPaymentMethods(MARCH_2026);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2025-03-01",
      date_to: "2025-03-31",
    });
    expect(res.body.data.comparison).toEqual({
      sales_amount: 50,
      refunded_amount: 0,
      methods: [
        { method: "cash", sales_amount: 50, sales_share: 1, payment_count: 1, refunded_amount: 0 },
      ],
    });
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getPaymentMethods({ ...MARCH_2026, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/payment-methods old Sales", () => {
  it("counts a Sale with no payment row as one payment of its payment_method", async () => {
    const res = await getPaymentMethods({
      date_from: "2026-04-01",
      date_to: "2026-04-30",
      compare: "none",
    });

    expect(res.body.data.current).toEqual({
      sales_amount: 12,
      refunded_amount: 0,
      methods: [
        { method: "card", sales_amount: 12, sales_share: 1, payment_count: 1, refunded_amount: 0 },
      ],
    });
  });
});

describe("GET /sales-transactions/analytics/payment-methods validation", () => {
  it("refuses date_from after date_to with a 400", async () => {
    const res = await getPaymentMethods({ date_from: "2026-04-01", date_to: "2026-03-01" });

    expect(res.status).toBe(400);
  });
});
