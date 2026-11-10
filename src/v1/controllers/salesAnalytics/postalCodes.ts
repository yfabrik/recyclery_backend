import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  SalesAnalyticsPostalCodesResponse,
  SalesPostalCodeDto,
  SalesPostalCodesDto,
} from "@recyclerie/api/responses/salesAnalytics";
import { asPostal } from "../../../mappers/brands.js";
import db from "../../../models/index.js";
import {
  loadTransactions,
  salesAnalyticsRoute,
  type AnalyticsTransaction,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

const { SalesTransaction } = db;

const TOP_POSTAL_CODES = 10;

/** The postal code typed at the till; blank means none (the till does not require one). */
const postalCodeOf = (raw: string | null): string | null => raw?.trim() || null;

/**
 * Postal code of each refunded Sale, wherever and whenever it was made. A
 * Refund has no postal code of its own, so it counts against its Sale's.
 */
const refundedSalePostalCodes = async (
  refunds: AnalyticsTransaction[],
): Promise<Map<number, string | null>> => {
  const saleIds = [...new Set(refunds.flatMap((r) => r.refundedSaleId ?? []))];
  if (saleIds.length === 0) return new Map();
  const sales = await SalesTransaction.findAll({
    attributes: ["id", "customer_postal_code"],
    where: { id: saleIds },
  });
  return new Map(
    sales.map((sale) => [sale.id, postalCodeOf(sale.customer_postal_code)]),
  );
};

const sumAmounts = (transactions: AnalyticsTransaction[] = []) =>
  transactions.reduce((total, t) => total + t.amount, 0);

export const computePostalCodes = async (
  scope: SalesAnalyticsScope,
): Promise<SalesPostalCodesDto> => {
  const transactions = await loadTransactions(scope);
  const sales = transactions.filter((t) => t.kind === "sale");
  const refunds = transactions.filter((t) => t.kind === "refund");
  const refundedSaleCodes = await refundedSalePostalCodes(refunds);

  const salesByCode = Map.groupBy(sales, (sale) => postalCodeOf(sale.postalCode));
  const refundsByCode = Map.groupBy(refunds, (refund) =>
    refund.refundedSaleId == null
      ? null
      : (refundedSaleCodes.get(refund.refundedSaleId) ?? null),
  );

  // Only postal codes with a Sale in scope: a Refund alone does not list one.
  const postalCodes = [...salesByCode].flatMap(([code, codeSales]) => {
    if (code == null) return [];
    const gross = sumAmounts(codeSales);
    return [
      {
        code,
        net: gross - sumAmounts(refundsByCode.get(code)),
        gross,
        salesCount: codeSales.length,
      },
    ];
  });

  return {
    postal_codes: postalCodes
      .sort(
        (a, b) =>
          b.net - a.net || b.salesCount - a.salesCount || a.code.localeCompare(b.code),
      )
      .slice(0, TOP_POSTAL_CODES)
      .map(
        (p): SalesPostalCodeDto => ({
          postal_code: asPostal(p.code),
          net_revenue: roundCurrency(p.net),
          sales_count: p.salesCount,
          average_basket: roundCurrency(p.gross / p.salesCount),
        }),
      ),
    sales_with_postal_code: postalCodes.reduce((total, p) => total + p.salesCount, 0),
    sales_count: sales.length,
  };
};

/** `GET /sales-transactions/analytics/postal-codes` */
export const salesAnalyticsPostalCodes = salesAnalyticsRoute<SalesAnalyticsPostalCodesResponse>(
  computePostalCodes,
);
