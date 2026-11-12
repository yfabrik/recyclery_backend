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

const getTimeline = (query) =>
  request(app).get("/sales-transactions/analytics/timeline").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

const figures = (net, gross, refunded, sales) => ({
  net_revenue: net,
  gross_revenue: gross,
  refunded_amount: refunded,
  sales_count: sales,
});
const ZERO = figures(0, 0, 0, 0);
const bucket = (date_from, date_to, amounts = ZERO) => ({ date_from, date_to, ...amounts });
const day = (date, amounts = ZERO) => bucket(date, date, amounts);

/** `2024-02-01` … `2024-02-<last>`. */
const monthDays = (month, last) =>
  Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);

/*
 * February 2024, a leap month, compared by default with February 2023.
 *
 * Orgelet                                    Lons
 *   1 Feb 00:30 Paris  Sale  8                 29 Feb  Sale 30
 *   5 Feb             Sale 20                  29 Feb  Refund 5
 *   5 Feb             Sale 27 (30 − 10 %)
 *   6 Feb  pending    100 (not counted)
 *   7 Feb  cancelled  200 (not counted)
 *   8 Feb  pending Refund 4 (not counted)
 *   9 Feb  gift card top-up 25, no lines (not a Sale)
 *  12 Feb             Refund 10 of the 5 Feb Sale
 *   1 Mar 00:30 Paris  Sale 50 (23:30 UTC on 29 Feb)
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

describe("GET /sales-transactions/analytics/timeline by day", () => {
  it("returns every Paris day of a range up to 31 days, closed days as 0", async () => {
    const res = await getTimeline(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current.step).toBe("day");
    expect(res.body.data.current.buckets).toEqual(
      monthDays("2024-02", 29).map((date) => {
        switch (date) {
          case "2024-02-01":
            return day(date, figures(8, 8, 0, 1));
          case "2024-02-05":
            return day(date, figures(47, 47, 0, 2));
          case "2024-02-12":
            return day(date, figures(-10, 0, 10, 0));
          case "2024-02-29":
            return day(date, figures(25, 30, 5, 1));
          default:
            // Pending, cancelled and lineless sells count nowhere.
            return day(date);
        }
      }),
    );
  });

  it("counts a Refund on its own day, not on its Sale's", async () => {
    const { buckets } = (await getTimeline(FEB_2024)).body.data.current;

    expect(buckets[4]).toEqual(day("2024-02-05", figures(47, 47, 0, 2)));
    expect(buckets[11]).toEqual(day("2024-02-12", figures(-10, 0, 10, 0)));
  });

  it("puts a Sale made at 23:30 UTC on the next Paris day", async () => {
    const { buckets } = (await getTimeline(FEB_2024)).body.data.current;

    expect(buckets[0]).toEqual(day("2024-02-01", figures(8, 8, 0, 1)));
    // Orgelet's 50 € at 23:30 UTC on 29 Feb belongs to 1 March.
    expect(buckets[28]).toEqual(day("2024-02-29", figures(25, 30, 5, 1)));
  });

  it("adds up to the KPIs of the range", async () => {
    const { buckets } = (await getTimeline(FEB_2024)).body.data.current;
    const total = (key) => buckets.reduce((sum, b) => sum + b[key], 0);

    expect(total("net_revenue")).toBe(70);
    expect(total("gross_revenue")).toBe(85);
    expect(total("refunded_amount")).toBe(15);
    expect(total("sales_count")).toBe(4);
  });
});

describe("GET /sales-transactions/analytics/timeline Store scope", () => {
  it("counts only the chosen Store's Sales and Refunds", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getTimeline({ ...FEB_2024, store_id: orgelet.store.id }),
      getTimeline({ ...FEB_2024, store_id: lons.store.id }),
    ]);
    const nonEmpty = (res) =>
      res.body.data.current.buckets.filter((b) => b.gross_revenue || b.refunded_amount);

    expect(nonEmpty(orgeletRes)).toEqual([
      day("2024-02-01", figures(8, 8, 0, 1)),
      day("2024-02-05", figures(47, 47, 0, 2)),
      day("2024-02-12", figures(-10, 0, 10, 0)),
    ]);
    expect(nonEmpty(lonsRes)).toEqual([day("2024-02-29", figures(25, 30, 5, 1))]);
  });
});

describe("GET /sales-transactions/analytics/timeline comparison", () => {
  it("has one comparison entry per bucket, by position; a day past the end of a shorter comparison is null", async () => {
    const { ranges, comparison } = (await getTimeline(FEB_2024)).body.data;

    expect(ranges.comparison).toEqual({ date_from: "2023-02-01", date_to: "2023-02-28" });
    expect(comparison.step).toBe("day");
    expect(comparison.buckets).toEqual([
      ...monthDays("2023-02", 28).map((date) =>
        date === "2023-02-28" ? day(date, figures(40, 40, 0, 1)) : day(date),
      ),
      // 29 Feb 2024 has no counterpart in 2023.
      null,
    ]);
  });

  it("compares day i with day i of the previous month on compare=previous, the extra days left out", async () => {
    const { ranges, comparison } = (
      await getTimeline({ ...FEB_2024, compare: "previous" })
    ).body.data;

    expect(ranges.comparison).toEqual({ date_from: "2024-01-01", date_to: "2024-01-31" });
    // The Sale at 23:30 UTC on 31 Jan is on 1 Feb in Paris, so January is empty.
    expect(comparison.buckets).toEqual(monthDays("2024-01", 29).map((date) => day(date)));
  });

  it("returns no comparison on compare=none", async () => {
    const res = await getTimeline({ ...FEB_2024, compare: "none" });

    expect(res.status).toBe(200);
    expect(res.body.data.comparison).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/timeline by week", () => {
  // Wednesday 31 Jan to Tuesday 5 Mar 2024: 35 days.
  const WEEKS = { date_from: "2024-01-31", date_to: "2024-03-05" };

  it("cuts a range of more than 31 days into Monday weeks, the edge weeks at their real dates", async () => {
    const { current } = (await getTimeline(WEEKS)).body.data;

    expect(current.step).toBe("week");
    expect(current.buckets).toEqual([
      bucket("2024-01-31", "2024-02-04", figures(8, 8, 0, 1)),
      bucket("2024-02-05", "2024-02-11", figures(47, 47, 0, 2)),
      bucket("2024-02-12", "2024-02-18", figures(-10, 0, 10, 0)),
      bucket("2024-02-19", "2024-02-25"),
      // Lons 30 − 5 on 29 Feb, Orgelet 50 on 1 Mar.
      bucket("2024-02-26", "2024-03-03", figures(75, 80, 5, 2)),
      bucket("2024-03-04", "2024-03-05"),
    ]);
  });

  it("compares each week with the same days shifted, clipped to the comparison range", async () => {
    const { ranges, comparison } = (await getTimeline(WEEKS)).body.data;

    expect(ranges.comparison).toEqual({ date_from: "2023-01-31", date_to: "2023-03-05" });
    expect(comparison.buckets).toEqual([
      bucket("2023-01-31", "2023-02-04"),
      bucket("2023-02-05", "2023-02-11"),
      bucket("2023-02-12", "2023-02-18"),
      bucket("2023-02-19", "2023-02-25"),
      bucket("2023-02-26", "2023-03-04", figures(40, 40, 0, 1)),
      bucket("2023-03-05", "2023-03-05"),
    ]);
  });

  it("leaves null a week shifted past the end of a shorter comparison", async () => {
    // Q2 2025 (91 days, ends on Monday 30 Jun) against Q1 2025 (90 days).
    const { current, comparison } = (
      await getTimeline({
        date_from: "2025-04-01",
        date_to: "2025-06-30",
        period: "quarter",
        compare: "previous",
      })
    ).body.data;

    expect(current.buckets).toHaveLength(14);
    expect(current.buckets[0]).toEqual(bucket("2025-04-01", "2025-04-06"));
    expect(current.buckets[13]).toEqual(bucket("2025-06-30", "2025-06-30"));
    expect(comparison.buckets).toHaveLength(14);
    expect(comparison.buckets[0]).toEqual(bucket("2025-01-01", "2025-01-06"));
    expect(comparison.buckets[12]).toEqual(bucket("2025-03-25", "2025-03-31"));
    expect(comparison.buckets[13]).toBeNull();
  });
});

describe("GET /sales-transactions/analytics/timeline by month", () => {
  // 20 Aug 2023 to 10 Mar 2024: 204 days.
  const MONTHS = { date_from: "2023-08-20", date_to: "2024-03-10" };

  it("cuts a range over about 6 months into calendar months, the edge months at their real dates", async () => {
    const { current } = (await getTimeline(MONTHS)).body.data;

    expect(current.step).toBe("month");
    expect(current.buckets).toEqual([
      bucket("2023-08-20", "2023-08-31"),
      bucket("2023-09-01", "2023-09-30"),
      bucket("2023-10-01", "2023-10-31"),
      bucket("2023-11-01", "2023-11-30"),
      bucket("2023-12-01", "2023-12-31"),
      // The Sale at 23:30 UTC on 31 Jan is in February.
      bucket("2024-01-01", "2024-01-31"),
      bucket("2024-02-01", "2024-02-29", figures(70, 85, 15, 4)),
      bucket("2024-03-01", "2024-03-10", figures(50, 50, 0, 1)),
    ]);
  });

  it("compares each month with the same month of the comparison range", async () => {
    const { comparison } = (await getTimeline(MONTHS)).body.data;

    expect(comparison.buckets).toEqual([
      bucket("2022-08-20", "2022-08-31"),
      bucket("2022-09-01", "2022-09-30"),
      bucket("2022-10-01", "2022-10-31"),
      bucket("2022-11-01", "2022-11-30"),
      bucket("2022-12-01", "2022-12-31"),
      bucket("2023-01-01", "2023-01-31"),
      bucket("2023-02-01", "2023-02-28", figures(40, 40, 0, 1)),
      bucket("2023-03-01", "2023-03-10"),
    ]);
  });
});

describe("GET /sales-transactions/analytics/timeline step", () => {
  const stepOf = async (date_to) =>
    (await getTimeline({ date_from: "2024-01-01", date_to, compare: "none" })).body.data
      .current.step;

  it("shows days up to 31 days, weeks up to 184 days (six months), months beyond", async () => {
    expect(await stepOf("2024-01-31")).toBe("day");
    expect(await stepOf("2024-02-01")).toBe("week");
    expect(await stepOf("2024-07-02")).toBe("week");
    expect(await stepOf("2024-07-03")).toBe("month");
  });
});

describe("GET /sales-transactions/analytics/timeline validation", () => {
  it("refuses date_from after date_to with a 400", async () => {
    const res = await getTimeline({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
