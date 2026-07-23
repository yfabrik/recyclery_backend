import type {
  CashSessionDto,
  CashSessionStatsItemDto,
} from "@recyclerie/api/responses/cashSession";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type SalesTransaction from "../models/salestransaction.js";
import type User from "../models/user.js";
import { toCashRegisterRefDto } from "./cashRegister.js";
import { toUserRef } from "./refs.js";
import { toSalesTransactionDto } from "./salesTransactions.js";
import { requireUserId, toIsoDateTime, toNumber } from "./serialize.js";
import type { MapperInput } from "./types.js";
import type { CashSessionRefDto } from "@recyclerie/api";

type CashSessionMapperInput = MapperInput<CashSession> & {
  difference_amount?: number;
  CashRegister?: MapperInput<CashRegister> | null;
  User?: MapperInput<User> | null;
  SalesTransactions?: Array<MapperInput<SalesTransaction>>;
  transactions_count?: number | string;
  total_sales?: number | string;
};

// const toDifferenceAmount = (model: CashSessionMapperInput): number | undefined => {
//   if (model.difference_amount != null) {
//     return toNumber(model.difference_amount);
//   }
//   if (model.status === "open") return 0;
//   const closing = toOptionalNumber(model.closing_amount);
//   const expected = toOptionalNumber(model.expected_amount);
//   if (closing != null && expected != null) {
//     return closing - expected;
//   }
//   return undefined;
// };

export const toCashSessionDto = (
  model: CashSessionMapperInput,
): CashSessionDto => {
  const cashRegister = model.CashRegister
    ? toCashRegisterRefDto(model.CashRegister)
    : null;

  return ({
    id: model.id,
    opening_amount: toNumber(model.opening_amount),
    closing_amount: model.closing_amount,
    expected_amount: model.expected_amount,
    difference_amount: model.difference_amount,//toDifferenceAmount(model),
    status: model.status,
    notes: model.notes,
    closed_at:model.closed_at ? toIsoDateTime(model.closed_at):null ,
    cash_register_id: model.cash_register_id,
    user_id: requireUserId(model.user_id),
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    ...(model.transactions_count != null
      ? { transactions_count: toNumber(model.transactions_count) }
      : {}),
    ...(model.total_sales != null
      ? { total_sales: toNumber(model.total_sales) }
      : {}),
    CashRegister: cashRegister,
    User: toUserRef(model.User),
    SalesTransactions: model.SalesTransactions?.map(toSalesTransactionDto),
  }) satisfies CashSessionDto;
};

export const toCashSessionRef = (
  value: CashSessionMapperInput,
): CashSessionRefDto | undefined => {
  if (typeof value.id !== "number") return undefined;
  //FIXME: FIx user_id in db
  // Legacy rows may have null user_id (column still allowNull); DTO requires non-null.
  if (value.user_id == null) return undefined;
  // return toCashSessionDto(value)satisfies CashSessionRefDto
  return {
    id: value.id,
    opening_amount: value.opening_amount,
    closing_amount: value.closing_amount,
    expected_amount: value.expected_amount,
    status: value.status,
    notes: value.notes,
    closed_at: value.closed_at ? toIsoDateTime(value.closed_at) : null,
    cash_register_id: value.cash_register_id,
    user_id: requireUserId(value.user_id),
    createdAt: toIsoDateTime(value.createdAt),
    updatedAt: toIsoDateTime(value.updatedAt),
  } satisfies CashSessionRefDto;
};

export const toOptionalCashSessionDto = (
  model: CashSessionMapperInput | null | undefined,
): CashSessionDto | null => (model == null ? null : toCashSessionDto(model));

export const toCashSessionStatsItemDto = (
  value: CashSessionStatsItemDto,
): CashSessionStatsItemDto => value;
