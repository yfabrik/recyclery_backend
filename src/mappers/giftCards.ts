import type {
  GiftCardBalanceDto,
  GiftCardDto,
  GiftCardSummaryDto,
  GiftCardTransactionDto,
} from "@recyclerie/api/responses/giftCards";

import type GiftCard from "../models/giftcard.js";
import type GiftCardTransaction from "../models/giftcardtransaction.js";
import { asEmail, asAlphanumeric } from "./brands.js";
import { requireUserId, toIsoDateTime, toNumber } from "./serialize.js";
import type {  MapperInput } from "./types.js";

type GiftCardTransactionMapperInput = MapperInput<GiftCardTransaction>;

type GiftCardMapperInput = MapperInput<GiftCard> & {
  current_value?: number | null;
  movements?: Array<GiftCardTransactionMapperInput>;
};

export const toGiftCardTransactionDto = (
  model: GiftCardTransactionMapperInput,
): GiftCardTransactionDto =>
  ({
    gift_card_id: model.gift_card_id,
    sales_transaction_id: model.sales_transaction_id,
    type: model.type,
    amount: toNumber(model.amount),
    occurred_at: toIsoDateTime(model.occurred_at),
    metadata: model.metadata,
    created_by: model.created_by != null ? requireUserId(model.created_by) : null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies GiftCardTransactionDto;

export const toGiftCardDto = (model: GiftCardMapperInput): GiftCardDto => {
  const movements = model.movements?.map(toGiftCardTransactionDto);

  const currentValue =
    model.current_value != null
      ? toNumber(model.current_value)
      : movements != null
        ? movements.reduce((sum, movement) => sum + movement.amount, 0)
        : undefined;

  return ({
    id: model.id,
    code: model.code,
    initial_value: toNumber(model.initial_value),
    ...(currentValue != null ? { current_value: currentValue } : {}),
    expires_at: model.expires_at ? toIsoDateTime(model.expires_at) : null,
    status: model.status,
    currency: model.currency ?? "EUR",
    issued_at: toIsoDateTime(model.issued_at),
    note: model.note,
    recipient_name: asAlphanumeric(model.recipient_name),
    recipient_email: asEmail(model.recipient_email),
    issued_transaction_id: model.issued_transaction_id ,
    issued_refund_transaction_id: model.issued_refund_transaction_id,
    created_by: model.created_by != null ? requireUserId(model.created_by) : null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    ...(movements ? { movements } : {}),
  }) satisfies GiftCardDto;
};

export const toGiftCardSummaryFromFields = (card: {
  id: number;
  code: string;
  status: GiftCardSummaryDto["status"];
  initial_value?: number;
  current_balance?: number;
}): GiftCardSummaryDto =>
  ({
    id: card.id,
    code: card.code,
    status: card.status,
    currentBalance: card.current_balance ?? card.initial_value,
  }) satisfies GiftCardSummaryDto;

export const toGiftCardSummaryDto = (
  model: GiftCardMapperInput,
): GiftCardSummaryDto => {
  const dto = toGiftCardDto(model);
  return ({
    id: dto.id,
    code: dto.code,
    status: dto.status,
    ...(dto.current_value != null ? { currentBalance: dto.current_value } : {}),
  }) satisfies GiftCardSummaryDto;
};

export const toGiftCardBalanceDto = (balance: {
  id: number;
  code: string;
  initial_value: number;
  movement_sum: number;
  current_balance: number;
}): GiftCardBalanceDto => balance;
