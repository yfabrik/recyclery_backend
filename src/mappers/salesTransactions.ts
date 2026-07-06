import type {
  PostalCodeStatsDto,
  SalesTransactionCashSessionDto,
  SalesTransactionDto,
  SalesTransactionItemDto,
  SalesTransactionStatsDto,
  TransactionGlobalPromotionDto,
  TransactionItemLineDto,
  TransactionPaymentDto,
} from "@recyclerie/api/responses/salesTransactions";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type GiftCard from "../models/giftcard.js";
import type LabeledItem from "../models/labeleditem.js";
import type SalesTransaction from "../models/salestransaction.js";
import type TransactionGlobalPromotion from "../models/transactionGlobalPromotion.js";
import type TransactionItem from "../models/transactionitem.js";
import type TransactionPayment from "../models/transactionpayment.js";
import type User from "../models/user.js";
import { asEmail, asPostal } from "./brands.js";
import { toCashRegisterSessionRefDto } from "./cashRegister.js";
import { toGiftCardSummaryDto } from "./giftCards.js";
import { toLabeledItemDto } from "./items.js";
import { toUserRef } from "./refs.js";
import { toIsoDate, toNumber, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type TransactionPaymentMapperInput = MapperInput<TransactionPayment>;
type TransactionGlobalPromotionMapperInput =
  MapperInput<TransactionGlobalPromotion>;

type TransactionItemLineMapperInput = MapperInput<TransactionItem> & {
  total_price?: number | string;
};

type SalesTransactionItemMapperInput = MapperInput<LabeledItem> & {
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
  customer_postal_code?: string | null;
  transaction_count: number | string;
  average_transaction: number | string;
  total_sales: number | string;
}

const toTransactionPaymentDto = (
  model: TransactionPaymentMapperInput,
): TransactionPaymentDto => ({
  id: model.id,
  method: model.method,
  amount: toNumber(model.amount),
  metadata: model.metadata ?? null,
  gift_card_id: model.gift_card_id ?? null,
  createdAt: toIsoDate(model.createdAt),
  updatedAt: toIsoDate(model.updatedAt),
});

const toTransactionItemLineDto = (
  value: TransactionItemLineMapperInput | null | undefined,
): TransactionItemLineDto | null | undefined => {
  if (value == null) return value === null ? null : undefined;
  return stripUndefined({
    name: value.name,
    price: toNumber(value.price),
    quantity: toNumber(value.quantity),
    promotionValue: toNumber(value.promotionValue),
    bundleQuantity: value.bundleQuantity ?? null,
    bundlePrice: toOptionalNumber(value.bundlePrice) ?? null,
    total_price: toNumber(value.total_price),
    createdAt: toIsoDate(value.createdAt),
    updatedAt: toIsoDate(value.updatedAt),
  }) as TransactionItemLineDto;
};

const toSalesTransactionItemDto = (
  model: SalesTransactionItemMapperInput,
): SalesTransactionItemDto => {
  const line = toTransactionItemLineDto(model.TransactionItem);
  return {
    ...toLabeledItemDto(model),
    ...(line !== undefined ? { TransactionItem: line } : {}),
  } as SalesTransactionItemDto;
};

const toTransactionGlobalPromotionDto = (
  model: TransactionGlobalPromotionMapperInput,
): TransactionGlobalPromotionDto => ({
  id: model.id,
  value: toNumber(model.value),
  type: model.type,
  createdAt: toIsoDate(model.createdAt),
  updatedAt: toIsoDate(model.updatedAt),
});

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
): SalesTransactionCashSessionDto | null | undefined => {
  if (value == null) return value === null ? null : undefined;

  const cashRegister = value.CashRegister
    ? toCashRegisterSessionRefDto(value.CashRegister)
    : null;

  return {
    id: value.id,
    opening_amount: toNumber(value.opening_amount),
    closing_amount: toOptionalNumber(value.closing_amount) ?? null,
    expected_amount: toOptionalNumber(value.expected_amount) ?? null,
    status: value.status,
    cash_register_id: value.cash_register_id,
    user_id: value.user_id,
    CashRegister: cashRegister,
    User: toUserRef(value.User) ?? null,
  };
};

export const toSalesTransactionDto = (
  model: SalesTransactionMapperInput,
): SalesTransactionDto => {
  const changeAmount = getChangeAmount(model);

  return stripUndefined({
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
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    items: model.items?.map(toSalesTransactionItemDto),
    payments: model.payments?.map(toTransactionPaymentDto),
    globalPromotions: model.globalPromotions?.map(toTransactionGlobalPromotionDto),
    CashSession: toSalesTransactionCashSessionDto(model.CashSession),
    User: toUserRef(model.User),
    refunds: model.refunds?.map(toSalesTransactionDto),
    giftCards: model.giftCards?.map(toGiftCardSummaryDto),
  }) as SalesTransactionDto;
};

export const toSalesTransactionStatsDto = (
  stats: SalesTransactionStatsDto,
): SalesTransactionStatsDto => stats;

export const toPostalCodeStatsDto = (
  row: PostalCodeStatsRow,
): PostalCodeStatsDto => ({
  customer_postal_code: asPostal(row.customer_postal_code),
  transaction_count: row.transaction_count,
  average_transaction: row.average_transaction,
  total_sales: row.total_sales,
});
