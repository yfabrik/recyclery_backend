import { roundCurrency } from "@recyclerie/api/domain/cart";
import type { Weekday } from "@recyclerie/api/enums";
import type {
  SalesAnalyticsHeatmapResponse,
  SalesHeatmapDto,
} from "@recyclerie/api/responses/salesAnalytics";
import {
  loadTransactions,
  parisHour,
  salesAnalyticsRoute,
  sumTransactions,
  type AnalyticsTransaction,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";
import { weekday, WEEKDAYS_MONDAY_FIRST } from "../../../utils/dates.js";

const cellKey = (day: Weekday, hour: number) => `${day}-${hour}`;

/** Paris weekday and hour of the transaction. */
const cellKeyOf = (transaction: AnalyticsTransaction) =>
  cellKey(weekday(transaction.createdAt), parisHour(transaction.createdAt));

/**
 * Net revenue and Sales per Paris weekday and hour. A Refund counts in the
 * hour it was made, not its Sale's. Columns are the hours with at least one
 * Sale in the range.
 */
export const computeHeatmap = async (
  scope: SalesAnalyticsScope,
): Promise<SalesHeatmapDto> => {
  const transactions = await loadTransactions(scope);
  const hours = [
    ...new Set(
      transactions
        .filter((t) => t.kind === "sale")
        .map((t) => parisHour(t.createdAt)),
    ),
  ].sort((a, b) => a - b);
  const byCell = Map.groupBy(transactions, cellKeyOf);

  return {
    hours,
    rows: WEEKDAYS_MONDAY_FIRST.map((day) => ({
      weekday: day,
      cells: hours.map((hour) => {
        const { sales, refunds } = sumTransactions(byCell.get(cellKey(day, hour)) ?? []);
        return {
          hour,
          net_revenue: roundCurrency(sales.amount - refunds.amount),
          sales_count: sales.count,
        };
      }),
    })),
  };
};

/** `GET /sales-transactions/analytics/heatmap` */
export const salesAnalyticsHeatmap = salesAnalyticsRoute<SalesAnalyticsHeatmapResponse>(computeHeatmap);
