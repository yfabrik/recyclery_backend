import type { IsoDate } from "@recyclerie/api";
import {
  addDays,
  addMonths,
  daysBetween,
  endOfMonth,
  startOfIsoWeek,
  startOfMonth,
} from "@recyclerie/api/domain/calendar";
import type { SalesTimelineStep } from "@recyclerie/api/responses/salesAnalytics";
import { dayCount, type DateRange } from "./ranges.js";

/** Longest range shown day by day. */
const DAY_STEP_MAX_DAYS = 31;
/** Longest range shown week by week: six calendar months (1 Jul – 31 Dec). */
const WEEK_STEP_MAX_DAYS = 184;

/** Day up to 31 days, Monday week up to six months, month beyond. */
export const timelineStep = (range: DateRange): SalesTimelineStep => {
  const days = dayCount(range);
  if (days <= DAY_STEP_MAX_DAYS) return "day";
  if (days <= WEEK_STEP_MAX_DAYS) return "week";
  return "month";
};

/** Last day of the day, Monday week or calendar month containing `date`. */
const UNIT_END: Record<SalesTimelineStep, (date: IsoDate) => IsoDate> = {
  day: (date) => date,
  week: (date) => addDays(startOfIsoWeek(date), 6),
  month: endOfMonth,
};

const earliest = (a: IsoDate, b: IsoDate) => (a < b ? a : b);
const latest = (a: IsoDate, b: IsoDate) => (a > b ? a : b);

/** The part of `bucket` inside `range`, or null when they don't meet. */
const clip = (bucket: DateRange, range: DateRange): DateRange | null => {
  const date_from = latest(bucket.date_from, range.date_from);
  const date_to = earliest(bucket.date_to, range.date_to);
  return date_from <= date_to ? { date_from, date_to } : null;
};

/** The range cut into days, Monday weeks or calendar months; the edge buckets keep their real dates. */
const rangeBuckets = (range: DateRange, step: SalesTimelineStep): DateRange[] => {
  const buckets: DateRange[] = [];
  let date_from = range.date_from;
  while (date_from <= range.date_to) {
    const date_to = earliest(UNIT_END[step](date_from), range.date_to);
    buckets.push({ date_from, date_to });
    date_from = addDays(date_to, 1);
  }
  return buckets;
};

const monthIndex = (date: string) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

/**
 * The buckets of `range`, by position on those of `current` (the range the
 * step and the buckets are chosen on), so week 1 is compared with week 1.
 * Called with `current` itself, it returns the current buckets.
 *
 * Bucket i of another range is current bucket i shifted onto it, by the days
 * between the two starts (day and week steps: same length, same position) or
 * by the months between them (month step: the same calendar month), then
 * clipped to the range. Null where it falls past the end of a shorter range;
 * days past the end of the current buckets are left out.
 */
export const timelineBuckets = (
  current: DateRange,
  range: DateRange,
): (DateRange | null)[] => {
  const step = timelineStep(current);
  const buckets = rangeBuckets(current, step);
  // Spec: "the same buckets shifted". A longer comparison range (1–31 Mar vs
  // 1–30 Apr) loses its extra trailing days; each bucket keeps its real dates.
  if (step === "month") {
    const months = monthIndex(range.date_from) - monthIndex(current.date_from);
    return buckets.map((bucket) => {
      const month = addMonths(startOfMonth(bucket.date_from), months);
      return clip({ date_from: month, date_to: endOfMonth(month) }, range);
    });
  }
  const days = daysBetween(current.date_from, range.date_from);
  return buckets.map((bucket) =>
    clip(
      { date_from: addDays(bucket.date_from, days), date_to: addDays(bucket.date_to, days) },
      range,
    ),
  );
};

/** Every calendar day of the range, in order. */
export const rangeDays = (range: DateRange): IsoDate[] =>
  Array.from({ length: dayCount(range) }, (_, i) => addDays(range.date_from, i));
