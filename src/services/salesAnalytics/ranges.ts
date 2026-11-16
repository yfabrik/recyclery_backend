import type { IsoDate } from "@recyclerie/api";
import {
  addDays,
  addMonths,
  addYears,
  daysBetween,
  startOfIsoWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "@recyclerie/api/domain/calendar";
import type { SalesAnalyticsDateRangeDto } from "@recyclerie/api/responses/salesAnalytics";
import type {
  SalesAnalyticsCompareMode,
  SalesAnalyticsPeriod,
} from "@recyclerie/api/schemas/salesAnalytics";
import { assertNever } from "../../utils/assertNever.js";
import { startOfDay } from "../../utils/dates.js";

/** Inclusive range of Paris calendar dates (`YYYY-MM-DD`). */
export type DateRange = SalesAnalyticsDateRangeDto;

/** `[start, end)` instants of a `DateRange`, from midnight Paris on `date_from` to midnight Paris after `date_to`. */
export type UtcBounds = { start: Date; end: Date };

type PresetUnit = {
  /** First day of the unit containing `date`. */
  start: (date: string) => IsoDate;
  /** `date` moved by `count` units; a month shift clamps to the end of a shorter month. */
  shift: (date: string, count: number) => IsoDate;
};

/** The unit of each preset period: Monday week, calendar month, quarter, year. */
const PRESET_UNITS = {
  week: { start: startOfIsoWeek, shift: (date, count) => addDays(date, 7 * count) },
  month: { start: startOfMonth, shift: addMonths },
  quarter: { start: startOfQuarter, shift: (date, count) => addMonths(date, 3 * count) },
  year: { start: startOfYear, shift: addYears },
} satisfies Record<Exclude<SalesAnalyticsPeriod, "custom">, PresetUnit>;

/** Last day of the unit that starts on `start`. */
const unitEnd = (unit: PresetUnit, start: string) => addDays(unit.shift(start, 1), -1);

/** The range is one whole unit: from its first day to its last. */
const isWholeUnit = (unit: PresetUnit, { date_from, date_to }: DateRange) =>
  date_from === unit.start(date_from) && date_to === unitEnd(unit, date_from);

/** Number of calendar days in the range, both ends included. */
export const dayCount = (range: DateRange) =>
  daysBetween(range.date_from, range.date_to) + 1;

/**
 * The range a period is compared with, or null for `compare=none`.
 *
 * - `last_year`: the same days one year earlier; 29 Feb maps to 28 Feb.
 * - `previous` on a preset: a whole unit (week, month, quarter, year, from
 *   its first day to its last) is compared with the whole unit before
 *   (1–30 Apr → 1–31 Mar, 1–31 Mar → 1–28 Feb). Any other range shifts both
 *   ends by one unit, clamped to the end of the target unit (1 Oct–30 Nov →
 *   1 Jul–30 Aug, 1–30 Mar → 1–28 Feb): the same span of days.
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
      const unit = PRESET_UNITS[period];
      const date_from = unit.shift(range.date_from, -1);
      // A preset range never leaves its unit, so the shift's own clamping to
      // the end of a shorter month keeps date_to inside the target unit.
      return {
        date_from,
        date_to: isWholeUnit(unit, range)
          ? unitEnd(unit, date_from)
          : unit.shift(range.date_to, -1),
      };
    }
    default:
      return assertNever(compare);
  }
};

/** UTC instants bounding a range of Paris calendar dates. */
export const parisDayBounds = (range: DateRange): UtcBounds => ({
  start: startOfDay(range.date_from).toDate(),
  end: startOfDay(addDays(range.date_to, 1)).toDate(),
});
