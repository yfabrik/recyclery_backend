import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  SalesAnalyticsTimelineResponse,
  SalesTimelineBucketDto,
  SalesTimelineDto,
} from "@recyclerie/api/responses/salesAnalytics";
import {
  loadTransactions,
  parisDay,
  salesAnalyticsRoute,
  sumTransactions,
  type AnalyticsTransaction,
  type DateRange,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";
import {
  rangeDays,
  timelineBuckets,
  timelineStep,
} from "../../../services/salesAnalytics/timeline.js";

const bucketFigures = (
  bucket: DateRange,
  byDay: Map<string, AnalyticsTransaction[]>,
): SalesTimelineBucketDto => {
  const { sales, refunds } = sumTransactions(
    rangeDays(bucket).flatMap((date) => byDay.get(date) ?? []),
  );
  return {
    ...bucket,
    net_revenue: roundCurrency(sales.amount - refunds.amount),
    gross_revenue: roundCurrency(sales.amount),
    refunded_amount: roundCurrency(refunds.amount),
    sales_count: sales.count,
  };
};

/** Net revenue by day, week or month; the comparison on the current range's buckets, by position. */
export const computeTimeline = async (
  scope: SalesAnalyticsScope,
): Promise<SalesTimelineDto> => {
  const { current } = scope.request.ranges;
  const transactions = await loadTransactions(scope);
  const byDay = Map.groupBy(transactions, (t) => parisDay(t.createdAt));
  return {
    step: timelineStep(current),
    buckets: timelineBuckets(current, scope.range).map(
      (bucket) => bucket && bucketFigures(bucket, byDay),
    ),
  };
};

/** `GET /sales-transactions/analytics/timeline` */
export const salesAnalyticsTimeline = salesAnalyticsRoute<SalesAnalyticsTimelineResponse>(computeTimeline);
