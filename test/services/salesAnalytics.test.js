import { describe, expect, it } from "@jest/globals";
import {
  comparisonRange,
  parisDayBounds,
  ratio,
  roundShare,
  transactionKind,
} from "../../src/services/salesAnalytics/index";
import {
  dateColumn,
  numberColumn,
  parseRawRows,
} from "../../src/services/salesAnalytics/rawRows";
import z from "zod";

const range = (date_from, date_to) => ({ date_from, date_to });

describe("parisDayBounds", () => {
  const iso = ({ start, end }) => ({
    start: start.toISOString(),
    end: end.toISOString(),
  });

  it("runs from midnight Paris on date_from to midnight Paris after date_to", () => {
    expect(iso(parisDayBounds(range("2026-11-01", "2026-11-09")))).toEqual({
      start: "2026-10-31T23:00:00.000Z",
      end: "2026-11-09T23:00:00.000Z",
    });
    expect(iso(parisDayBounds(range("2026-07-14", "2026-07-14")))).toEqual({
      start: "2026-07-13T22:00:00.000Z",
      end: "2026-07-14T22:00:00.000Z",
    });
  });

  it("follows the DST change inside the range", () => {
    expect(iso(parisDayBounds(range("2026-03-29", "2026-03-29")))).toEqual({
      start: "2026-03-28T23:00:00.000Z",
      end: "2026-03-29T22:00:00.000Z",
    });
  });
});

describe("comparisonRange", () => {
  it("is null when compare=none", () => {
    expect(
      comparisonRange(range("2026-11-01", "2026-11-09"), "month", "none"),
    ).toBeNull();
  });

  describe("last_year", () => {
    it("keeps the same days one year earlier", () => {
      expect(
        comparisonRange(range("2026-11-01", "2026-11-09"), "month", "last_year"),
      ).toEqual(range("2025-11-01", "2025-11-09"));
    });

    it("maps 29 Feb to 28 Feb", () => {
      expect(
        comparisonRange(range("2024-02-01", "2024-02-29"), "month", "last_year"),
      ).toEqual(range("2023-02-01", "2023-02-28"));
      expect(
        comparisonRange(range("2028-02-29", "2028-03-03"), "custom", "last_year"),
      ).toEqual(range("2027-02-28", "2027-03-03"));
    });
  });

  describe("previous on a preset", () => {
    it("shifts a partial month by one month, same days", () => {
      expect(
        comparisonRange(range("2026-11-01", "2026-11-09"), "month", "previous"),
      ).toEqual(range("2026-10-01", "2026-10-09"));
    });

    it("clamps to the end of the shorter month", () => {
      expect(
        comparisonRange(range("2026-03-01", "2026-03-31"), "month", "previous"),
      ).toEqual(range("2026-02-01", "2026-02-28"));
    });

    it("compares a whole month with the whole month before", () => {
      expect(
        comparisonRange(range("2026-04-01", "2026-04-30"), "month", "previous"),
      ).toEqual(range("2026-03-01", "2026-03-31"));
    });

    it("compares a whole quarter with the whole quarter before", () => {
      expect(
        comparisonRange(range("2026-04-01", "2026-06-30"), "quarter", "previous"),
      ).toEqual(range("2026-01-01", "2026-03-31"));
      expect(
        comparisonRange(range("2026-01-01", "2026-03-31"), "quarter", "previous"),
      ).toEqual(range("2025-10-01", "2025-12-31"));
    });

    it("shifts a partial quarter by three months, even when it ends on a month end", () => {
      expect(
        comparisonRange(range("2026-10-01", "2026-11-30"), "quarter", "previous"),
      ).toEqual(range("2026-07-01", "2026-08-30"));
      expect(
        comparisonRange(range("2026-01-01", "2026-02-28"), "quarter", "previous"),
      ).toEqual(range("2025-10-01", "2025-11-28"));
    });

    it("shifts a month to date by one month, clamped to the end of the shorter month", () => {
      expect(
        comparisonRange(range("2026-03-01", "2026-03-30"), "month", "previous"),
      ).toEqual(range("2026-02-01", "2026-02-28"));
      expect(
        comparisonRange(range("2026-05-01", "2026-05-30"), "month", "previous"),
      ).toEqual(range("2026-04-01", "2026-04-30"));
    });

    it("shifts a month range that does not start on the 1st, even when it ends on a month end", () => {
      expect(
        comparisonRange(range("2026-04-15", "2026-04-30"), "month", "previous"),
      ).toEqual(range("2026-03-15", "2026-03-30"));
    });

    it("compares a whole week and a whole year with the whole unit before", () => {
      expect(
        comparisonRange(range("2026-03-02", "2026-03-08"), "week", "previous"),
      ).toEqual(range("2026-02-23", "2026-03-01"));
      expect(
        comparisonRange(range("2025-01-01", "2025-12-31"), "year", "previous"),
      ).toEqual(range("2024-01-01", "2024-12-31"));
    });

    it("shifts a week by seven days", () => {
      expect(
        comparisonRange(range("2026-11-02", "2026-11-08"), "week", "previous"),
      ).toEqual(range("2026-10-26", "2026-11-01"));
    });

    it("shifts a year by one year", () => {
      expect(
        comparisonRange(range("2026-01-01", "2026-11-09"), "year", "previous"),
      ).toEqual(range("2025-01-01", "2025-11-09"));
    });
  });

  describe("previous on a custom range", () => {
    it("is the same number of days ending the day before date_from", () => {
      expect(
        comparisonRange(range("2026-11-10", "2026-11-19"), "custom", "previous"),
      ).toEqual(range("2026-10-31", "2026-11-09"));
    });

    it("works for a single day", () => {
      expect(
        comparisonRange(range("2026-03-01", "2026-03-01"), "custom", "previous"),
      ).toEqual(range("2026-02-28", "2026-02-28"));
    });
  });
});

describe("transactionKind", () => {
  it("reads a sell as a Sale and a refund as a Refund", () => {
    expect(transactionKind("sell")).toBe("sale");
    expect(transactionKind("refund")).toBe("refund");
  });
});

describe("parseRawRows", () => {
  const row = z.object({ amount: numberColumn, at: dateColumn, note: z.string().nullable() });

  it("reads MariaDB's DECIMAL strings and Dates and SQLite's numbers and date text alike", () => {
    expect(
      parseRawRows(row, [
        { amount: "12.50", at: new Date("2026-11-08T23:30:00Z"), note: null },
        { amount: 12.5, at: "2026-11-08 23:30:00.000 +00:00", note: "x" },
      ]),
    ).toEqual([
      { amount: 12.5, at: new Date("2026-11-08T23:30:00Z"), note: null },
      { amount: 12.5, at: new Date("2026-11-08T23:30:00Z"), note: "x" },
    ]);
  });

  it("refuses a row that does not fit with a plain error, not a ZodError (a 500, not a 400)", () => {
    let error;
    try {
      parseRawRows(row, [{ amount: "abc", at: "2026-11-08", note: null }]);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(z.ZodError);
    expect(error.message).toMatch(/Unexpected sales analytics row/);
  });
});

describe("ratio", () => {
  it("divides, or is 0 when the denominator is not positive", () => {
    expect(ratio(3, 4)).toBe(0.75);
    expect(ratio(3, 0)).toBe(0);
    expect(ratio(3, -2)).toBe(0);
  });
});

describe("roundShare", () => {
  it("rounds a 0–1 share to 4 decimals", () => {
    expect(roundShare(0.123456)).toBe(0.1235);
    expect(roundShare(2 / 3)).toBe(0.6667);
    expect(roundShare(1)).toBe(1);
  });
});
