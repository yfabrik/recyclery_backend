import { roundCurrency } from "@recyclerie/api/domain/cart";
import { SALES_PAYMENT_METHODS, type SalesPaymentMethod } from "@recyclerie/api/enums";
import type {
  SalesAnalyticsPaymentMethodsResponse,
  SalesPaymentMethodDto,
  SalesPaymentMethodsDto,
} from "@recyclerie/api/responses/salesAnalytics";
import {
  loadPayments,
  ratio,
  salesAnalyticsRoute,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

type MethodTotals = { sales: number; count: number; refunded: number };

const byLargest = (a: SalesPaymentMethodDto, b: SalesPaymentMethodDto) =>
  b.sales_amount - a.sales_amount ||
  b.refunded_amount - a.refunded_amount ||
  SALES_PAYMENT_METHODS.indexOf(a.method) - SALES_PAYMENT_METHODS.indexOf(b.method);

export const computePaymentMethods = async (
  scope: SalesAnalyticsScope,
): Promise<SalesPaymentMethodsDto> => {
  const payments = await loadPayments(scope);
  const byMethod = new Map<SalesPaymentMethod, MethodTotals>();
  for (const payment of payments) {
    const totals = byMethod.get(payment.method) ?? { sales: 0, count: 0, refunded: 0 };
    if (payment.kind === "sale") {
      totals.sales += payment.amount;
      totals.count += payment.count;
    } else {
      totals.refunded += payment.amount;
    }
    byMethod.set(payment.method, totals);
  }

  const totals = [...byMethod.values()];
  const salesAmount = roundCurrency(totals.reduce((sum, t) => sum + t.sales, 0));
  const refundedAmount = roundCurrency(totals.reduce((sum, t) => sum + t.refunded, 0));
  const methods = [...byMethod].map(([method, t]): SalesPaymentMethodDto => {
    const sales = roundCurrency(t.sales);
    return {
      method,
      sales_amount: sales,
      sales_share: ratio(sales, salesAmount),
      payment_count: t.count,
      refunded_amount: roundCurrency(t.refunded),
    };
  });
  return {
    sales_amount: salesAmount,
    refunded_amount: refundedAmount,
    methods: methods.sort(byLargest),
  };
};

/** `GET /sales-transactions/analytics/payment-methods` */
export const salesAnalyticsPaymentMethods = salesAnalyticsRoute<SalesAnalyticsPaymentMethodsResponse>(
  computePaymentMethods,
);
