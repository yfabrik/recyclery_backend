/**
 * Backend re-export of shared date helpers.
 * Prefer importing from `@recyclerie/api/domain/date` (or `@recyclerie/api`) in new code.
 */
export {
  APP_TZ,
  combineDateAndTime,
  dateFromWeekday,
  dayjs,
  endOfDay,
  now,
  startOfDay,
  toIsoDate,
  toIsoDateTime,
  toIsoTime,
  toOptionalIsoDateTime,
  weekday,
  weekdaySortKey,
  getWeekNumber,
  WEEKDAY_LABELS_FR,
  WEEKDAYS_MONDAY_FIRST,
} from "@recyclerie/api/domain/date";
