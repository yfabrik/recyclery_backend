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

const getHeatmap = (query) =>
  request(app).get("/sales-transactions/analytics/heatmap").query(query);

/** Monday 25 March to Sunday 7 April 2024: Paris switches to summer time on Sunday 31 March. */
const AROUND_DST = {
  date_from: "2024-03-25",
  date_to: "2024-04-07",
  period: "custom",
  compare: "none",
};

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKDAY_NAME = Object.fromEntries(
  Object.entries(WEEKDAY).map(([name, n]) => [n, name]),
);

/** The cell of a weekday ("Mon") and a Paris hour. */
const cellAt = (heatmap, day, hour) =>
  heatmap.rows
    .find((row) => row.weekday === WEEKDAY[day])
    .cells.find((cell) => cell.hour === hour);

/** Cells with a Sale or a Refund, as { "Mon 10h": [net revenue, sales count] }. */
const filledCells = (heatmap) =>
  Object.fromEntries(
    heatmap.rows.flatMap((row) =>
      row.cells
        .filter((cell) => cell.net_revenue !== 0 || cell.sales_count !== 0)
        .map((cell) => [
          `${WEEKDAY_NAME[row.weekday]} ${cell.hour}h`,
          [cell.net_revenue, cell.sales_count],
        ]),
    ),
  );

/*
 * Instants are UTC. Paris is UTC+1 until Sunday 31 March 2024, UTC+2 after.
 *
 * Orgelet                                                     Paris
 *   Sun 24 Mar 23:30  Sale  8                                 Mon 25 Mar 0h30
 *   Mon 25 Mar 08:30  Sale 20                  (winter)       Mon 9h30
 *   Sat 30 Mar 13:10  Sale 40                                 Sat 14h10
 *   Sat 30 Mar 13:40  Sale 15                                 Sat 14h40
 *   Mon  1 Apr 08:30  Sale 30 (10 + 20)        (summer)       Mon 10h30
 *   Tue  2 Apr 15:20  Refund 20 of the Sale above             Tue 17h20
 *   Wed  3 Apr 16:30  Refund 15 of the Sat 14h40 Sale         Wed 18h30, no Sale at 18h
 *   Thu  4 Apr 06:00  pending 100 (not counted)               Thu 8h
 *   Fri  5 Apr 10:00  gift card top-up 25, no lines (not a Sale)  Fri 12h
 *   Fri  5 Apr 17:00  cancelled 200 (not counted)             Fri 19h
 *   Sat  6 Apr 15:05  Sale 25                                 Sat 17h05
 *   Sun  7 Apr 22:30  Sale 50                                 Mon 8 Apr 0h30, after the range
 *
 * Lons
 *   Thu  4 Apr 09:00  Sale 50                                 Thu 11h
 */
let orgelet;
let lons;

beforeAll(async () => {
  const category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");
  const line = (price, quantity = 1) => ({ price, quantity, category });

  await recordSale(orgelet.session, { at: "2024-03-24T23:30:00Z", lines: [line(8)] });
  await recordSale(orgelet.session, { at: "2024-03-25T08:30:00Z", lines: [line(20)] });
  await recordSale(orgelet.session, { at: "2024-03-30T13:10:00Z", lines: [line(40)] });
  const { sale: saturdaySale, items: saturdayItems } = await recordSale(orgelet.session, {
    at: "2024-03-30T13:40:00Z",
    lines: [line(15)],
  });
  const { sale: mondaySale, items: mondayItems } = await recordSale(orgelet.session, {
    at: "2024-04-01T08:30:00Z",
    lines: [line(10), line(20)],
  });
  await recordRefund(orgelet.session, {
    at: "2024-04-02T15:20:00Z",
    sale: mondaySale,
    lines: [{ item: mondayItems[1] }],
  });
  await recordRefund(orgelet.session, {
    at: "2024-04-03T16:30:00Z",
    sale: saturdaySale,
    lines: [{ item: saturdayItems[0] }],
  });
  await recordSale(orgelet.session, {
    at: "2024-04-04T06:00:00Z",
    lines: [line(100)],
    status: "pending",
  });
  await recordLinelessSell(orgelet.session, { at: "2024-04-05T10:00:00Z", amount: 25 });
  await recordSale(orgelet.session, {
    at: "2024-04-05T17:00:00Z",
    lines: [line(200)],
    status: "cancelled",
  });
  await recordSale(orgelet.session, { at: "2024-04-06T15:05:00Z", lines: [line(25)] });
  await recordSale(orgelet.session, { at: "2024-04-07T22:30:00Z", lines: [line(50)] });

  await recordSale(lons.session, { at: "2024-04-04T09:00:00Z", lines: [line(50)] });
});

describe("GET /sales-transactions/analytics/heatmap", () => {
  it("puts a Sale at 08:30 UTC in the 9h column in winter and in the 10h column in summer", async () => {
    const res = await getHeatmap(AROUND_DST);

    expect(res.status).toBe(200);
    expect(cellAt(res.body.data.current, "Mon", 9)).toEqual({
      hour: 9,
      net_revenue: 20,
      sales_count: 1,
    });
    expect(cellAt(res.body.data.current, "Mon", 10)).toEqual({
      hour: 10,
      net_revenue: 30,
      sales_count: 1,
    });
  });

  it("sums net revenue and Sales per Paris weekday and hour, each Refund in the hour it was made", async () => {
    const res = await getHeatmap(AROUND_DST);

    expect(filledCells(res.body.data.current)).toEqual({
      // 23:30 UTC on Sunday is 0h30 on Monday in Paris.
      "Mon 0h": [8, 1],
      "Mon 9h": [20, 1],
      // The Refund of 20 on Tuesday leaves its Monday Sale's cell as it was.
      "Mon 10h": [30, 1],
      "Tue 17h": [-20, 0],
      "Thu 11h": [50, 1],
      "Sat 14h": [55, 2],
      "Sat 17h": [25, 1],
    });
  });

  it("has a column for each hour with at least one Sale, and only those", async () => {
    const res = await getHeatmap(AROUND_DST);

    // No 8h (pending), 12h (gift card top-up), 18h (a Refund only) or 19h (cancelled).
    expect(res.body.data.current.hours).toEqual([0, 9, 10, 11, 14, 17]);
  });

  it("has one row per weekday, Monday to Sunday, each with one cell per column", async () => {
    const { current } = (await getHeatmap(AROUND_DST)).body.data;

    expect(current.rows.map((row) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    for (const row of current.rows) {
      expect(row.cells.map((cell) => cell.hour)).toEqual(current.hours);
    }
    expect(cellAt(current, "Sun", 0)).toEqual({ hour: 0, net_revenue: 0, sales_count: 0 });
  });
});

describe("GET /sales-transactions/analytics/heatmap Store scope", () => {
  it("keeps only the chosen Store's Sales, Refunds and hours", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getHeatmap({ ...AROUND_DST, store_id: orgelet.store.id }),
      getHeatmap({ ...AROUND_DST, store_id: lons.store.id }),
    ]);

    expect(orgeletRes.body.data.current.hours).toEqual([0, 9, 10, 14, 17]);
    expect(filledCells(orgeletRes.body.data.current)).not.toHaveProperty("Thu 11h");
    expect(lonsRes.body.data.current.hours).toEqual([11]);
    expect(filledCells(lonsRes.body.data.current)).toEqual({ "Thu 11h": [50, 1] });
  });
});

describe("GET /sales-transactions/analytics/heatmap empty and comparison", () => {
  it("has no column on a period without Sales", async () => {
    const res = await getHeatmap({ date_from: "2023-01-02", date_to: "2023-01-08", compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.current.hours).toEqual([]);
    expect(res.body.data.current.rows).toHaveLength(7);
    expect(res.body.data.current.rows.every((row) => row.cells.length === 0)).toBe(true);
  });

  it("computes no comparison on compare=none, which the page section always sends", async () => {
    const res = await getHeatmap(AROUND_DST);

    expect(res.body.data.ranges.comparison).toBeNull();
    expect(res.body.data.comparison).toBeNull();
  });

  it("refuses a missing date with a 400", async () => {
    const res = await getHeatmap({ date_from: "2024-03-25" });

    expect(res.status).toBe(400);
  });
});
