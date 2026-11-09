import type { IsoDate } from "@recyclerie/api";
import {
  addDays,
  addMonths,
  addYears,
  daysBetween,
  endOfMonth,
  isLastDayOfMonth,
} from "@recyclerie/api/domain/calendar";
import type { SalesAnalyticsDateRangeDto } from "@recyclerie/api/responses/salesAnalytics";
import type {
  SalesAnalyticsCompareMode,
  SalesAnalyticsPeriod,
} from "@recyclerie/api/schemas/salesAnalytics";
import { startOfDay } from "../../utils/dates.js";

/** Inclusive range of Paris calendar dates (`YYYY-MM-DD`). */
export type DateRange = SalesAnalyticsDateRangeDto;

/** `[start, end)` instants of a `DateRange`, from midnight Paris on `date_from` to midnight Paris after `date_to`. */
export type UtcBounds = { start: Date; end: Date };

const PRESET_SHIFT: Record<
  Exclude<SalesAnalyticsPeriod, "custom">,
  (date: string, sign: number) => IsoDate
> = {
  week: (date, sign) => addDays(date, 7 * sign),
  month: (date, sign) => addMonths(date, sign),
  quarter: (date, sign) => addMonths(date, 3 * sign),
  year: (date, sign) => addYears(date, sign),
};

/** Number of calendar days in the range, both ends included. */
export const dayCount = (range: DateRange) =>
  daysBetween(range.date_from, range.date_to) + 1;

/**
 * The range a period is compared with, or null for `compare=none`.
 *
 * - `last_year`: the same days one year earlier; 29 Feb maps to 28 Feb.
 * - `previous` on a preset: both ends shift by one unit (week, month,
 *   quarter, year), clamped to the end of the shorter month. A month or
 *   quarter that ends on the last day of a month is compared with the whole
 *   unit before (30 Apr → 31 Mar).
 * - `previous` on `custom`: the same number of days, ending the day before
 *   `date_from`.
 */
export const comparisonRange = (
  range: DateRange,
  period: SalesAnalyticsPeriod,
  compare: SalesAnalyticsCompareMode,
): DateRange | null => {
  switch (compare) {
    case "none":
      return null;
    case "last_year":
      return {
        date_from: addYears(range.date_from, -1),
        date_to: addYears(range.date_to, -1),
      };
    case "previous": {
      if (period === "custom") {
        const end = addDays(range.date_from, -1);
        return { date_from: addDays(end, 1 - dayCount(range)), date_to: end };
      }
      const shift = PRESET_SHIFT[period];
      const shiftedTo = shift(range.date_to, -1);
      const keepsMonthEnd =
        (period === "month" || period === "quarter") &&
        isLastDayOfMonth(range.date_to);
      return {
        date_from: shift(range.date_from, -1),
        date_to: keepsMonthEnd ? endOfMonth(shiftedTo) : shiftedTo,
      };
    }
  }
};

/** UTC instants bounding a range of Paris calendar dates. */
export const parisDayBounds = (range: DateRange): UtcBounds => ({
  start: startOfDay(range.date_from).toDate(),
  end: startOfDay(addDays(range.date_to, 1)).toDate(),
});
