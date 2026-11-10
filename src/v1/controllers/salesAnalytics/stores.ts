import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  SalesStoreDto,
  SalesStoresDto,
} from "@recyclerie/api/responses/salesAnalytics";
import {
  loadStores,
  loadTransactions,
  ratio,
  roundShare,
  salesAnalyticsRoute,
  sumTransactions,
  type AnalyticsStore,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

/**
 * The Stores to list: every active one, so a Store that sold nothing still
 * shows (at 0), plus the inactive ones that have transactions in the range,
 * so the rows add up to the KPIs. Only the chosen Store when there is one.
 */
const listedStores = (
  stores: AnalyticsStore[],
  storeId: SalesAnalyticsScope["storeId"],
  withTransactions: Set<AnalyticsStore["id"]>,
) =>
  stores.filter(
    (store) =>
      (store.isActive || withTransactions.has(store.id)) &&
      (storeId == null || store.id === storeId),
  );

export const computeStores = async (
  scope: SalesAnalyticsScope,
): Promise<SalesStoresDto> => {
  const [transactions, allStores] = await Promise.all([loadTransactions(scope), loadStores()]);
  const byStore = Map.groupBy(transactions, (t) => t.storeId);
  const stores = listedStores(allStores, scope.storeId, new Set(byStore.keys()));

  const figures = stores.map((store) => {
    const { sales, refunds } = sumTransactions(byStore.get(store.id) ?? []);
    return { store, sales, refunds, net: sales.amount - refunds.amount };
  });
  const totalNet = figures.reduce((total, f) => total + f.net, 0);

  const rows = figures.map(
    ({ store, sales, refunds, net }): SalesStoreDto => ({
      store_id: store.id,
      name: store.name,
      is_active: store.isActive,
      net_revenue: roundCurrency(net),
      gross_revenue: roundCurrency(sales.amount),
      refunded_amount: roundCurrency(refunds.amount),
      sales_count: sales.count,
      refund_count: refunds.count,
      average_basket: roundCurrency(ratio(sales.amount, sales.count)),
      net_revenue_share: roundShare(ratio(net, totalNet)),
    }),
  );
  return {
    stores: rows.sort(
      (a, b) => b.net_revenue - a.net_revenue || a.name.localeCompare(b.name, "fr"),
    ),
  };
};

/** `GET /sales-transactions/analytics/stores` */
export const salesAnalyticsStores = salesAnalyticsRoute(computeStores);
