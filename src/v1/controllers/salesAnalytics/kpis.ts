import { roundCurrency } from "@recyclerie/api/domain/cart";
import type { SalesKpisDto } from "@recyclerie/api/responses/salesAnalytics";
import {
  itemsSold,
  loadLines,
  loadTransactions,
  openingDays,
  salesAnalyticsRoute,
  sumTransactions,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export const computeKpis = async (
  scope: SalesAnalyticsScope,
): Promise<SalesKpisDto> => {
  const [transactions, lines] = await Promise.all([
    loadTransactions(scope),
    loadLines(scope),
  ]);
  const { sales, refunds } = sumTransactions(transactions);
  const net = sales.amount - refunds.amount;
  const days = openingDays(transactions).length;
  return {
    net_revenue: roundCurrency(net),
    gross_revenue: roundCurrency(sales.amount),
    refunded_amount: roundCurrency(refunds.amount),
    refund_count: refunds.count,
    sales_count: sales.count,
    average_basket: roundCurrency(ratio(sales.amount, sales.count)),
    items_sold: itemsSold(lines),
    opening_days: days,
    revenue_per_opening_day: roundCurrency(ratio(net, days)),
  };
};

/** `GET /sales-transactions/analytics/kpis` */
export const salesAnalyticsKpis = salesAnalyticsRoute(computeKpis);
