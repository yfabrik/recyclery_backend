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

const getPostalCodes = (query) =>
  request(app).get("/sales-transactions/analytics/postal-codes").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

/*
 * February 2024, compared by default with February 2023. A Refund has no
 * postal code of its own: it counts against the postal code of the Sale it
 * refunds, on its own date and in its own Store.
 *
 * Orgelet                                         Lons
 *   20 Jan            Sale  6  39000                20 Feb  Sale  4  39000
 *    1 Feb 00:30 Paris Sale  8  39270                21 Feb  Refund 8 of Orgelet's 1 Feb Sale (39270)
 *    5 Feb            Sale 20  39000 (2 items)      29 Feb  Sale 30  39570
 *    5 Feb            Sale 27  39000 (30 − 10 %)    29 Feb  Refund 5 of it
 *    6 Feb            Sale 12  no postal code
 *    6 Feb  pending   100      39000 (not counted)
 *    7 Feb  cancelled 200      39270 (not counted)
 *    9 Feb  gift card top-up 25, no lines (not a Sale)
 *   12 Feb            Refund 10 of the 5 Feb Sale of 20 (39000)
 *   14 Feb            Refund  6 of the 20 Jan Sale (39000)
 *    1 Mar 00:30 Paris Sale 50  39000 (next month)
 *
 *   28 Feb 2023       Sale 40  39000
 *   28 Feb 2023       Sale 10  no postal code
 */
let orgelet;
let lons;

beforeAll(async () => {
  const category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
  const line = (price, quantity = 1) => ({ price, quantity, category });

  const { sale: january, items: januaryItems } = await recordSale(orgelet.session, {
    at: "2024-01-20T10:00:00Z",
    lines: [line(6)],
    postalCode: "39000",
  });
  // 23:30 UTC on 31 Jan is 00:30 on 1 Feb in Paris.
  const { sale: firstOfFeb, items: firstOfFebItems } = await recordSale(orgelet.session, {
    at: "2024-01-31T23:30:00Z",
    lines: [line(8)],
    postalCode: "39270",
  });
  const { sale: twoItems, items } = await recordSale(orgelet.session, {
    at: "2024-02-05T09:00:00Z",
    lines: [line(10, 2)],
    postalCode: "39000",
  });
  await recordSale(orgelet.session, {
    at: "2024-02-05T14:00:00Z",
    lines: [line(30)],
    globalPromotion: { type: "percent", value: 10 },
    postalCode: "39000",
  });
  await recordSale(orgelet.session, { at: "2024-02-06T09:00:00Z", lines: [line(12)] });
  await recordSale(orgelet.session, {
    at: "2024-02-06T10:00:00Z",
    lines: [line(100)],
    status: "pending",
    postalCode: "39000",
  });
  await recordSale(orgelet.session, {
    at: "2024-02-07T10:00:00Z",
    lines: [line(200)],
    status: "cancelled",
    postalCode: "39270",
  });
  await recordLinelessSell(orgelet.session, { at: "2024-02-09T10:00:00Z", amount: 25 });
  await recordRefund(orgelet.session, {
    at: "2024-02-12T10:00:00Z",
    sale: twoItems,
    lines: [{ item: items[0], quantity: 1 }],
  });
  await recordRefund(orgelet.session, {
    at: "2024-02-14T10:00:00Z",
    sale: january,
    lines: [{ item: januaryItems[0] }],
  });
  // 23:30 UTC on 29 Feb is 00:30 on 1 Mar in Paris.
  await recordSale(orgelet.session, {
    at: "2024-02-29T23:30:00Z",
    lines: [line(50)],
    postalCode: "39000",
  });

  await recordSale(lons.session, {
    at: "2024-02-20T10:00:00Z",
    lines: [line(4)],
    postalCode: "39000",
  });
  await recordRefund(lons.session, {
    at: "2024-02-21T10:00:00Z",
    sale: firstOfFeb,
    lines: [{ item: firstOfFebItems[0] }],
  });
  const { sale: lonsSale, items: lonsItems } = await recordSale(lons.session, {
    at: "2024-02-29T10:00:00Z",
    lines: [line(15), line(5, 3)],
    postalCode: "39570",
  });
  await recordRefund(lons.session, {
    at: "2024-02-29T15:00:00Z",
    sale: lonsSale,
    lines: [{ item: lonsItems[1], quantity: 1 }],
  });

  await recordSale(orgelet.session, {
    at: "2023-02-28T13:00:00Z",
    lines: [line(40)],
    postalCode: "39000",
  });
  await recordSale(orgelet.session, { at: "2023-02-28T14:00:00Z", lines: [line(10)] });
});

describe("GET /sales-transactions/analytics/postal-codes", () => {
  it("ranks postal codes by net revenue, with Sales, average basket and the share of Sales that have one", async () => {
    const res = await getPostalCodes(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current).toEqual({
      postal_codes: [
        // 20 + 27 + 4 sold, 10 + 6 refunded; basket = 51 / 3.
        { postal_code: "39000", net_revenue: 35, sales_count: 3, average_basket: 17 },
        { postal_code: "39570", net_revenue: 25, sales_count: 1, average_basket: 30 },
        // Refunded in full at Lons.
        { postal_code: "39270", net_revenue: 0, sales_count: 1, average_basket: 8 },
      ],
      sales_with_postal_code: 5,
      sales_count: 6,
    });
  });
});

describe("GET /sales-transactions/analytics/postal-codes Store scope", () => {
  it("counts only the chosen Store's Sales, and the Refunds paid out there", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getPostalCodes({ ...FEB_2024, store_id: orgelet.store.id }),
      getPostalCodes({ ...FEB_2024, store_id: lons.store.id }),
    ]);

    expect(orgeletRes.body.data.current).toEqual({
      postal_codes: [
        { postal_code: "39000", net_revenue: 31, sales_count: 2, average_basket: 23.5 },
        // Its Refund was paid out at Lons.
        { postal_code: "39270", net_revenue: 8, sales_count: 1, average_basket: 8 },
      ],
      sales_with_postal_code: 3,
      sales_count: 4,
    });
    // 39270 only has a Refund at Lons: it is not listed.
    expect(lonsRes.body.data.current).toEqual({
      postal_codes: [
        { postal_code: "39570", net_revenue: 25, sales_count: 1, average_basket: 30 },
        { postal_code: "39000", net_revenue: 4, sales_count: 1, average_basket: 4 },
      ],
      sales_with_postal_code: 2,
      sales_count: 2,
    });
  });
});

describe("GET /sales-transactions/analytics/postal-codes comparison", () => {
  it("gives the same figures for the same days last year", async () => {
    const res = await getPostalCodes(FEB_2024);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2023-02-01",
      date_to: "2023-02-28",
    });
    expect(res.body.data.comparison).toEqual({
      postal_codes: [
        { postal_code: "39000", net_revenue: 40, sales_count: 1, average_basket: 40 },
      ],
      sales_with_postal_code: 1,
      sales_count: 2,
    });
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getPostalCodes({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/postal-codes top 10", () => {
  it("lists the 10 postal codes with the highest net revenue, but counts every Sale with a postal code", async () => {
    const category = await createCategory({ name: "Livres" });
    const store = await createStore("Champagnole");
    // 11 postal codes, 39301 sold for 1 €, …, 39311 for 11 €.
    for (let n = 1; n <= 11; n += 1) {
      await recordSale(store.session, {
        at: `2025-03-${String(n).padStart(2, "0")}T10:00:00Z`,
        lines: [{ price: n, category }],
        postalCode: String(39300 + n),
      });
    }

    const res = await getPostalCodes({
      date_from: "2025-03-01",
      date_to: "2025-03-31",
      period: "month",
      compare: "none",
    });

    const { postal_codes, sales_with_postal_code, sales_count } = res.body.data.current;
    expect(postal_codes.map((p) => p.postal_code)).toEqual([
      "39311", "39310", "39309", "39308", "39307",
      "39306", "39305", "39304", "39303", "39302",
    ]);
    expect(postal_codes[0]).toEqual({
      postal_code: "39311",
      net_revenue: 11,
      sales_count: 1,
      average_basket: 11,
    });
    expect(sales_with_postal_code).toBe(11);
    expect(sales_count).toBe(11);
  });
});

describe("GET /sales-transactions/analytics/postal-codes validation", () => {
  it("refuses date_from after date_to with a 400", async () => {
    const res = await getPostalCodes({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
  });
});
