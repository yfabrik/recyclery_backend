import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  SalesStoreDto,
  SalesStoresDto,
} from "@recyclerie/api/responses/salesAnalytics";
import { Op } from "sequelize";
import db from "../../../models/index.js";
import {
  loadTransactions,
  salesAnalyticsRoute,
  sumTransactions,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

const { Recyclery } = db;

const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

const roundShare = (share: number) => Math.round(share * 10_000) / 10_000;

/**
 * The Stores to list: every active one, so a Store that sold nothing still
 * shows (at 0), plus the inactive ones that have transactions in the range,
 * so the rows add up to the KPIs. Only the chosen Store when there is one.
 */
const loadStores = (storeId: number | null, withTransactions: number[]) =>
  Recyclery.findAll({
    attributes: ["id", "name", "is_active"],
    where: {
      [Op.or]: [{ is_active: true }, { id: withTransactions }],
      ...(storeId ? { id: storeId } : {}),
    },
  });

export const computeStores = async (
  scope: SalesAnalyticsScope,
): Promise<SalesStoresDto> => {
  const transactions = await loadTransactions(scope);
  const byStore = Map.groupBy(transactions, (t) => t.storeId);
  const stores = await loadStores(scope.storeId, [...byStore.keys()]);

  const figures = stores.map((store) => {
    const { sales, refunds } = sumTransactions(byStore.get(store.id) ?? []);
    return { store, sales, refunds, net: sales.amount - refunds.amount };
  });
  const totalNet = figures.reduce((total, f) => total + f.net, 0);

  const rows = figures.map(
    ({ store, sales, refunds, net }): SalesStoreDto => ({
      store_id: store.id,
      name: store.name,
      is_active: store.is_active,
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
