import type {
  PostalCodeStatsDto,
  SalesTransactionDto,
  SalesTransactionItemDto,
  SalesTransactionStatsDto,
  TransactionGlobalPromotionDto,
  TransactionItemLineDto,
  TransactionPaymentDto,
} from "@recyclerie/api/responses/salesTransactions";
import type { CashSessionDto } from "@recyclerie/api/responses/cashSession";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type GiftCard from "../models/giftcard.js";
import type SalesTransaction from "../models/salestransaction.js";
import type TransactionGlobalPromotion from "../models/transactionGlobalPromotion.js";
import type TransactionItem from "../models/transactionitem.js";
import type TransactionPayment from "../models/transactionpayment.js";
import type User from "../models/user.js";
import { asEmail, asPostal } from "./brands.js";
import { toCashRegisterRefDto } from "./cashRegister.js";
import { toGiftCardSummaryDto } from "./giftCards.js";
import { toLabeledItemDto, type LabeledItemMapperInput } from "./items.js";
import { toUserRef } from "./refs.js";
import {
  toIsoDateTime,
  toNumber,
  toOptionalIsoDate,
  toOptionalNumber,
  requireUserId,
} from "./serialize.js";
import type {  MapperInput } from "./types.js";

type TransactionPaymentMapperInput = MapperInput<TransactionPayment>;
type TransactionGlobalPromotionMapperInput =
  MapperInput<TransactionGlobalPromotion>;

type TransactionItemLineMapperInput = MapperInput<TransactionItem> & {
  total_price?: number | string;
};

type SalesTransactionItemMapperInput = LabeledItemMapperInput & {
  TransactionItem?: TransactionItemLineMapperInput | null;
};

type SalesTransactionCashSessionInput = MapperInput<CashSession> & {
  CashRegister?: MapperInput<CashRegister> | null;
  User?: MapperInput<User> | null;
};

type SalesTransactionMapperInput = MapperInput<SalesTransaction> & {
  change_amount?: number;
  global_promotion?: number | null;
  global_promotion_type?: SalesTransactionDto["global_promotion_type"];
  items?: Array<SalesTransactionItemMapperInput>;
  payments?: Array<TransactionPaymentMapperInput>;
  globalPromotions?: Array<TransactionGlobalPromotionMapperInput>;
  CashSession?: SalesTransactionCashSessionInput | null;
  User?: MapperInput<User> | null;
  refunds?: Array<SalesTransactionMapperInput>;
  giftCards?: Array<MapperInput<GiftCard>>;
};

export interface PostalCodeStatsRow {
  customer_postal_code: string ;
  transaction_count: number | string;
  average_transaction: number | string;
  total_sales: number | string;
}

const toTransactionPaymentDto = (
  model: TransactionPaymentMapperInput,
): TransactionPaymentDto =>
  ({
    id: model.id,
    method: model.method,
    amount: toNumber(model.amount),
    metadata: model.metadata ?? null,
    sales_transaction_id: model.sales_transaction_id,
    gift_card_id: model.gift_card_id ?? null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies TransactionPaymentDto;

const toTransactionItemLineDto = (
  value: TransactionItemLineMapperInput | null | undefined,
): TransactionItemLineDto | null | undefined => {
  if (value == null) return value === null ? null : undefined;
  return ({
    name: value.name,
    price: toNumber(value.price),
    quantity: toNumber(value.quantity),
    promotionValue: toNumber(value.promotionValue),
    bundleQuantity: value.bundleQuantity ?? null,
    bundlePrice: toOptionalNumber(value.bundlePrice) ?? null,
    total_price: toNumber(value.total_price),
    createdAt: toIsoDateTime(value.createdAt),
    updatedAt: toIsoDateTime(value.updatedAt),
  }) satisfies TransactionItemLineDto;
};

const toSalesTransactionItemDto = (
  model: SalesTransactionItemMapperInput,
): SalesTransactionItemDto => {
  const line = toTransactionItemLineDto(model.TransactionItem);
  if (line == null) {
    throw new Error("expected TransactionItem on sales transaction item");
  }
  return {
    ...toLabeledItemDto(model),
    TransactionItem: line,
  };
};

const toTransactionGlobalPromotionDto = (
  model: TransactionGlobalPromotionMapperInput,
): TransactionGlobalPromotionDto =>
  ({
    id: model.id,
    value: toNumber(model.value),
    type: model.type,
    transaction_id: model.transaction_id,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies TransactionGlobalPromotionDto;

const getChangeAmount = (model: SalesTransactionMapperInput): number | undefined => {
  if (model.change_amount != null) return toNumber(model.change_amount);
  return toNumber(model.payment_amount) - toNumber(model.total_amount);
};

const getGlobalPromotion = (
  model: SalesTransactionMapperInput,
): number | null => {
  if (model.global_promotion != null) return toNumber(model.global_promotion);
  const promo = model.globalPromotions?.[0];
  return promo != null ? toNumber(promo.value) : null;
};

const getGlobalPromotionType = (
  model: SalesTransactionMapperInput,
): SalesTransactionDto["global_promotion_type"] => {
  if (model.global_promotion_type != null) return model.global_promotion_type;
  return model.globalPromotions?.[0]?.type ?? null;
};

const toSalesTransactionCashSessionDto = (
  value: SalesTransactionCashSessionInput | null | undefined,
): CashSessionDto | null | undefined => {
  if (value == null) return value === null ? null : undefined;

  const cashRegister = value.CashRegister
    ? toCashRegisterRefDto(value.CashRegister)
    : null;

  return {
    id: value.id,
    opening_amount: toNumber(value.opening_amount),
    closing_amount: toOptionalNumber(value.closing_amount) ?? null,
    expected_amount: toOptionalNumber(value.expected_amount) ?? null,
    status: value.status,
    notes: value.notes ?? null,
    closed_at: toOptionalIsoDate(value.closed_at) ?? null,
    cash_register_id: value.cash_register_id,
    user_id: requireUserId(value.user_id),
    createdAt: toIsoDateTime(value.createdAt),
    updatedAt: toIsoDateTime(value.updatedAt),
    CashRegister: cashRegister,
    User: toUserRef(value.User) ?? null,
  } satisfies CashSessionDto;
};

export const toSalesTransactionDto = (
  model: SalesTransactionMapperInput,
): SalesTransactionDto => {
  const changeAmount = getChangeAmount(model);

  return ({
    id: model.id,
    total_amount_before_promotion: toNumber(model.total_amount_before_promotion),
    total_amount: toNumber(model.total_amount),
    payment_method: model.payment_method,
    transactionType: model.transactionType,
    payment_amount: toNumber(model.payment_amount),
    change_amount: changeAmount,
    global_promotion: getGlobalPromotion(model),
    global_promotion_type: getGlobalPromotionType(model) ?? null,
    customer_name: model.customer_name ?? null,
    customer_email: asEmail(model.customer_email),
    customer_postal_code: asPostal(model.customer_postal_code),
    status: model.status,
    cash_session_id: model.cash_session_id,
    created_by: model.created_by,
    transactionId: model.transactionId ?? null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    items: model.items?.map(toSalesTransactionItemDto),
    payments: model.payments?.map(toTransactionPaymentDto),
    globalPromotions: model.globalPromotions?.map(toTransactionGlobalPromotionDto),
    CashSession: toSalesTransactionCashSessionDto(model.CashSession),
    User: toUserRef(model.User),
    refunds: model.refunds?.map(toSalesTransactionDto),
    giftCards: model.giftCards?.map(toGiftCardSummaryDto),
  }) satisfies SalesTransactionDto;
};

export const toSalesTransactionStatsDto = (stats: {
  total_transactions: number | string;
  total_sales: number | string;
  total_sales_before_refunds: number | string;
  average_transaction: number | string;
  sessions_count: number | string;
  total_refunded: number | string;
  payment_methods: Array<{
    payment_method: SalesTransactionStatsDto["payment_methods"][number]["payment_method"];
    total: number | string;
    count: number | string;
  }>;
  by_day: Array<{
    date: string;
    transaction_count: number | string;
    total_amount: number | string;
  }>;
  by_category: Array<{
    category_id: number | string | null;
    category_name: string | null;
    total_quantity: number | string;
    total_price_sum: number | string;
  }>;
}): SalesTransactionStatsDto =>
  ({
    total_transactions: toNumber(stats.total_transactions),
    total_sales: toNumber(stats.total_sales),
    total_sales_before_refunds: toNumber(stats.total_sales_before_refunds),
    average_transaction: toNumber(stats.average_transaction),
    sessions_count: toNumber(stats.sessions_count),
    total_refunded: toNumber(stats.total_refunded),
    payment_methods: stats.payment_methods.map((row) => ({
      payment_method: row.payment_method,
      total: toNumber(row.total),
      count: toNumber(row.count),
    })),
    by_day: stats.by_day.map((row) => ({
      date: row.date,
      transaction_count: toNumber(row.transaction_count),
      total_amount: toNumber(row.total_amount),
    })),
    by_category: stats.by_category.map((row) => ({
      category_id:
        row.category_id == null || row.category_id === ""
          ? null
          : toNumber(row.category_id),
      category_name: row.category_name,
      total_quantity: toNumber(row.total_quantity),
      total_price_sum: toNumber(row.total_price_sum),
    })),
  }) satisfies SalesTransactionStatsDto;

export const toPostalCodeStatsDto = (
  row: PostalCodeStatsRow,
): PostalCodeStatsDto =>
  ({
    customer_postal_code: asPostal(row.customer_postal_code),
    transaction_count: toNumber(row.transaction_count),
    average_transaction: toNumber(row.average_transaction),
    total_sales: toNumber(row.total_sales),
  }) satisfies PostalCodeStatsDto;
