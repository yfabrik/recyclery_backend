import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  SalesAnalyticsCategoriesResponse,
  SalesCategoriesDto,
  SalesCategoryRowDto,
} from "@recyclerie/api/responses/salesAnalytics";
import {
  salesCategoriesQuerySchema,
  type SalesCategoriesQuery,
} from "@recyclerie/api/schemas/salesAnalytics";
import createHttpError from "http-errors";
import {
  NO_CATEGORY_LABEL,
  categoryAtLevel,
  categoryPath,
  loadCategoryTree,
  loadLines,
  ratio,
  roundShare,
  salesAnalyticsRoute,
  sumLinesByCategory,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

/** Label of the items attached directly to the opened category. */
const directItemsLabel = (name: string) => `${name} (sans sous-catégorie)`;

type CategoryGroup = {
  categoryId: number | null;
  name: string;
  hasSubcategories: boolean;
  net: number;
  quantity: number;
};

/**
 * Amounts rounded to the cent so that they still add up to their rounded
 * total: each gets its floor, and the cents left go to the largest remainders.
 */
const roundKeepingTotal = (amounts: number[]): number[] => {
  const exact = amounts.map((amount) => amount * 100);
  const cents = exact.map(Math.floor);
  const total = Math.round(exact.reduce((sum, value) => sum + value, 0));
  let left = total - cents.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    cents[index] = (cents[index] ?? 0) + 1;
    left -= 1;
  }
  return cents.map((value) => value / 100);
};

export const computeCategories = async (
  scope: SalesAnalyticsScope<SalesCategoriesQuery>,
): Promise<SalesCategoriesDto> => {
  const parentId = scope.request.query.parent_id ?? null;
  const [tree, lines] = await Promise.all([loadCategoryTree(), loadLines(scope)]);
  if (parentId != null && !tree.has(parentId)) {
    throw createHttpError.NotFound("Catégorie introuvable");
  }
  const withSubcategories = new Set(
    [...tree.values()].map((node) => node.parent_id).filter((id) => id != null),
  );

  const groups = new Map<number | null, CategoryGroup>();
  for (const totals of sumLinesByCategory(lines)) {
    const node = categoryAtLevel(tree, totals.categoryId, parentId);
    if (node === undefined) continue;
    const key = node?.id ?? null;
    const isDirect = node != null && node.id === parentId;
    const group = groups.get(key) ?? {
      categoryId: key,
      name:
        node == null
          ? NO_CATEGORY_LABEL
          : isDirect
            ? directItemsLabel(node.name)
            : node.name,
      hasSubcategories: node != null && !isDirect && withSubcategories.has(node.id),
      net: 0,
      quantity: 0,
    };
    group.net += totals.sales.net - totals.refunds.net;
    group.quantity += totals.sales.quantity - totals.refunds.quantity;
    groups.set(key, group);
  }

  const sorted = [...groups.values()].sort(
    (a, b) => b.net - a.net || a.name.localeCompare(b.name, "fr"),
  );
  const net = sorted.reduce((sum, group) => sum + group.net, 0);
  const rounded = roundKeepingTotal(sorted.map((group) => group.net));
  return {
    path: categoryPath(tree, parentId).map(({ id, name }) => ({ id, name })),
    net_revenue: roundCurrency(net),
    quantity: sorted.reduce((sum, group) => sum + group.quantity, 0),
    categories: sorted.map(
      (group, index): SalesCategoryRowDto => ({
        category_id: group.categoryId,
        name: group.name,
        has_subcategories: group.hasSubcategories,
        net_revenue: rounded[index] ?? 0,
        quantity: group.quantity,
        share: roundShare(ratio(group.net, net)),
        average_price: roundCurrency(ratio(group.net, group.quantity)),
      }),
    ),
  };
};

/** `GET /sales-transactions/analytics/categories` */
export const salesAnalyticsCategories = salesAnalyticsRoute<
  SalesAnalyticsCategoriesResponse,
  SalesCategoriesQuery
>(computeCategories, salesCategoriesQuerySchema);
