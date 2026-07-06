import type {
  GiftCardBalanceDto,
  GiftCardDto,
  GiftCardSummaryDto,
  GiftCardTransactionDto,
} from "@recyclerie/api/responses/giftCards";

import type GiftCard from "../models/giftcard.js";
import type GiftCardTransaction from "../models/giftcardtransaction.js";
import { asEmail, asAlphanumeric } from "./brands.js";
import { toIsoDate, toNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type GiftCardTransactionMapperInput = MapperInput<GiftCardTransaction>;

type GiftCardMapperInput = MapperInput<GiftCard> & {
  current_value?: number | null;
  movements?: Array<GiftCardTransactionMapperInput>;
};

export const toGiftCardTransactionDto = (
  model: GiftCardTransactionMapperInput,
): GiftCardTransactionDto => ({
  gift_card_id: model.gift_card_id,
  sales_transaction_id: model.sales_transaction_id,
  type: model.type,
  amount: toNumber(model.amount),
  ...(model.occurred_at ? { occurred_at: toIsoDate(model.occurred_at) } : {}),
  metadata: model.metadata ?? null,
  created_by: model.created_by,
  createdAt: toIsoDate(model.createdAt),
  updatedAt: toIsoDate(model.updatedAt),
});

export const toGiftCardDto = (model: GiftCardMapperInput): GiftCardDto => {
  const movements = model.movements?.map(toGiftCardTransactionDto);

  const currentValue =
    model.current_value != null
      ? toNumber(model.current_value)
      : movements != null
        ? movements.reduce((sum, movement) => sum + movement.amount, 0)
        : undefined;

  return {
    id: model.id,
    code: model.code,
    initial_value: toNumber(model.initial_value),
    ...(currentValue != null ? { current_value: currentValue } : {}),
    expires_at: model.expires_at ? toIsoDate(model.expires_at) : null,
    status: model.status,
    ...(model.currency != null ? { currency: model.currency } : {}),
    ...(model.issued_at ? { issued_at: toIsoDate(model.issued_at) } : {}),
    note: model.note ?? null,
    recipient_name: asAlphanumeric(model.recipient_name),
    recipient_email: asEmail(model.recipient_email),
    issued_transaction_id: model.issued_transaction_id ?? null,
    issued_refund_transaction_id: model.issued_refund_transaction_id ?? null,
    created_by: model.created_by ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    ...(movements ? { movements } : {}),
  };
};

export const toGiftCardSummaryFromFields = (card: {
  id: number;
  code: string;
  status: GiftCardSummaryDto["status"];
  initial_value?: number;
  current_balance?: number;
}): GiftCardSummaryDto =>
  stripUndefined({
    id: card.id,
    code: card.code,
    status: card.status,
    currentBalance: card.current_balance ?? card.initial_value,
  }) as GiftCardSummaryDto;

export const toGiftCardSummaryDto = (
  model: GiftCardMapperInput,
): GiftCardSummaryDto => {
  const dto = toGiftCardDto(model);
  return {
    id: dto.id,
    code: dto.code,
    status: dto.status,
    ...(dto.current_value != null ? { currentBalance: dto.current_value } : {}),
  };
};

export const toGiftCardBalanceDto = (balance: {
  id: number;
  code: string;
  initial_value: number;
  movement_sum: number;
  current_balance: number;
}): GiftCardBalanceDto => balance;
