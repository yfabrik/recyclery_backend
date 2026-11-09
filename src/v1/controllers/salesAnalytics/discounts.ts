import { roundCurrency } from "@recyclerie/api/domain/cart";
import {
  WHOLE_TRANSACTION_DISCOUNT_GROUPS,
  wholeTransactionDiscountKey,
  type StoredWholeTransactionDiscount,
} from "@recyclerie/api/domain/notableDiscounts";
import type {
  SalesDiscountCategoryDto,
  SalesDiscountsDto,
  WholeTransactionDiscountDto,
  WholeTransactionDiscountFiguresDto,
  WholeTransactionDiscountStoreDto,
} from "@recyclerie/api/responses/salesAnalytics";
import { loadWholeTransactionDiscounts } from "../../../services/salesAnalytics/wholeTransactionDiscounts.js";
import { loadStoreNames } from "../../../services/salesAnalytics/storeNames.js";
import {
  categoryPath,
  loadCategoryTree,
  loadLines,
  loadTransactions,
  NO_CATEGORY_LABEL,
  salesAnalyticsRoute,
  type AnalyticsLine,
  type AnalyticsTransaction,
  type CategoryTree,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

const TOP_CATEGORIES = 5;

const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

/** The amount a Sale's whole-transaction discount removed. Nothing stores it. */
const wholeTransactionDiscountOf = (sale: AnalyticsTransaction) =>
  sale.amountBeforeDiscount - sale.amount;

/** Each line carries its share of its Sale's whole-transaction discount (`loadLines`). */
const topCategories = (
  tree: CategoryTree,
  saleLines: AnalyticsLine[],
): SalesDiscountCategoryDto[] => {
  const byCategory = new Map<
    number | null,
    { name: string; categoryPromotion: number; wholeTransaction: number }
  >();
  for (const line of saleLines) {
    const top = categoryPath(tree, line.categoryId)[0];
    const id = top?.id ?? null;
    const entry = byCategory.get(id) ?? {
      name: top?.name ?? NO_CATEGORY_LABEL,
      categoryPromotion: 0,
      wholeTransaction: 0,
    };
    entry.categoryPromotion += line.listValue - line.value;
    entry.wholeTransaction += line.wholeTransactionDiscount;
    byCategory.set(id, entry);
  }
  return [...byCategory.entries()]
    .map(([category_id, entry]) => ({
      category_id,
      name: entry.name,
      discount: roundCurrency(entry.categoryPromotion + entry.wholeTransaction),
      category_promotion_discount: roundCurrency(entry.categoryPromotion),
      whole_transaction_discount: roundCurrency(entry.wholeTransaction),
    }))
    .filter((category) => category.discount > 0)
    .sort((a, b) => b.discount - a.discount || a.name.localeCompare(b.name, "fr"))
    .slice(0, TOP_CATEGORIES);
};

const discountFigures = (
  sales: AnalyticsTransaction[],
): WholeTransactionDiscountFiguresDto => ({
  sales_count: sales.length,
  discount_amount: roundCurrency(
    sales.reduce((total, sale) => total + wholeTransactionDiscountOf(sale), 0),
  ),
  average_basket_before: roundCurrency(
    ratio(
      sales.reduce((total, sale) => total + sale.amountBeforeDiscount, 0),
      sales.length,
    ),
  ),
  average_basket_after: roundCurrency(
    ratio(
      sales.reduce((total, sale) => total + sale.amount, 0),
      sales.length,
    ),
  ),
});

const byStore = (
  sales: AnalyticsTransaction[],
  storeNames: Map<number, string>,
): WholeTransactionDiscountStoreDto[] =>
  [...Map.groupBy(sales, (sale) => sale.storeId)]
    .map(([storeId, storeSales]) => ({
      store_id: storeId,
      store_name: storeNames.get(storeId) ?? `Magasin ${storeId}`,
      ...discountFigures(storeSales),
    }))
    .sort(
      (a, b) =>
        b.discount_amount - a.discount_amount ||
        a.store_name.localeCompare(b.store_name, "fr"),
    );

/**
 * One entry per notable discount, then "Autres", each with the Sales that got
 * it; split by Store when `storeNames` is given (no Store selected).
 */
const wholeTransactionDiscounts = (
  sales: AnalyticsTransaction[],
  discounts: Map<number, StoredWholeTransactionDiscount>,
  storeNames: Map<number, string> | null,
): WholeTransactionDiscountDto[] => {
  const byKey = Map.groupBy(sales, (sale) =>
    wholeTransactionDiscountKey(discounts.get(sale.id)),
  );
  return WHOLE_TRANSACTION_DISCOUNT_GROUPS.map(({ key, label }) => {
    const discounted = byKey.get(key) ?? [];
    return {
      key,
      label,
      share_of_sales: ratio(discounted.length, sales.length),
      ...discountFigures(discounted),
      by_store: storeNames ? byStore(discounted, storeNames) : null,
    };
  });
};

export const computeDiscounts = async (
  scope: SalesAnalyticsScope,
): Promise<SalesDiscountsDto> => {
  const [transactions, lines, tree, discounts, storeNames] = await Promise.all([
    loadTransactions(scope),
    loadLines(scope),
    loadCategoryTree(),
    loadWholeTransactionDiscounts(scope),
    scope.storeId == null ? loadStoreNames() : null,
  ]);
  // Discounts count on Sales only: a Refund never gives one back.
  const sales = transactions.filter((t) => t.kind === "sale");
  const saleLines = lines.filter((line) => line.kind === "sale");

  const grossRevenue = sales.reduce((total, sale) => total + sale.amount, 0);
  const categoryPromotion = saleLines.reduce(
    (total, line) => total + line.listValue - line.value,
    0,
  );
  const wholeTransaction = sales.reduce(
    (total, sale) => total + wholeTransactionDiscountOf(sale),
    0,
  );
  const totalDiscount = categoryPromotion + wholeTransaction;

  return {
    total_discount: roundCurrency(totalDiscount),
    category_promotion_discount: roundCurrency(categoryPromotion),
    whole_transaction_discount: roundCurrency(wholeTransaction),
    gross_revenue: roundCurrency(grossRevenue),
    share_of_gross_revenue: ratio(totalDiscount, grossRevenue),
    sales_count: sales.length,
    top_categories: topCategories(tree, saleLines),
    whole_transaction_discounts: wholeTransactionDiscounts(sales, discounts, storeNames),
  };
};

/** `GET /sales-transactions/analytics/discounts` */
export const salesAnalyticsDiscounts = salesAnalyticsRoute(computeDiscounts);
