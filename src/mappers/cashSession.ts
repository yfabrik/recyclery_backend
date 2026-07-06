import type {
  CashSessionDto,
  CashSessionStatsItemDto,
} from "@recyclerie/api/responses/cashSession";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type Recyclery from "../models/recyclery.js";
import type SalesTransaction from "../models/salestransaction.js";
import type User from "../models/user.js";
import { toCashRegisterSessionRefDto } from "./cashRegister.js";
import { toRecycleryRef, toUserRef } from "./refs.js";
import { toSalesTransactionDto } from "./salesTransactions.js";
import { toIsoDate, toNumber, toOptionalIsoDate, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type CashSessionMapperInput = MapperInput<CashSession> & {
  difference_amount?: number;
  CashRegister?: MapperInput<CashRegister> | null;
  Recyclery?: MapperInput<Recyclery> | null;
  User?: MapperInput<User> | null;
  SalesTransactions?: Array<MapperInput<SalesTransaction>>;
  transactions_count?: number | string;
  total_sales?: number | string;
};

const toDifferenceAmount = (model: CashSessionMapperInput): number | undefined => {
  if (model.difference_amount != null) {
    return toNumber(model.difference_amount);
  }
  if (model.status === "open") return 0;
  const closing = toOptionalNumber(model.closing_amount);
  const expected = toOptionalNumber(model.expected_amount);
  if (closing != null && expected != null) {
    return closing - expected;
  }
  return undefined;
};

export const toCashSessionDto = (
  model: CashSessionMapperInput,
): CashSessionDto => {
  const cashRegister = model.CashRegister
    ? toCashRegisterSessionRefDto(model.CashRegister)
    : null;

  const recycleryFromRegister =
    cashRegister?.Recyclery ??
    toRecycleryRef(model.Recyclery) ??
    (model.Recyclery && typeof model.Recyclery.id === "number"
      ? stripUndefined({
          id: model.Recyclery.id,
          name: model.Recyclery.name,
        })
      : null);

  return stripUndefined({
    id: model.id,
    opening_amount: toNumber(model.opening_amount),
    closing_amount: toOptionalNumber(model.closing_amount) ?? null,
    expected_amount: toOptionalNumber(model.expected_amount) ?? null,
    difference_amount: toDifferenceAmount(model),
    status: model.status,
    notes: model.notes ?? null,
    closed_at: toOptionalIsoDate(model.closed_at) ?? null,
    cash_register_id: model.cash_register_id,
    user_id: model.user_id,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    transactions_count: model.transactions_count,
    total_sales: model.total_sales,
    CashRegister: cashRegister,
    Recyclery: recycleryFromRegister,
    User: toUserRef(model.User),
    SalesTransactions: model.SalesTransactions?.map(toSalesTransactionDto),
  }) as CashSessionDto;
};

export const toOptionalCashSessionDto = (
  model: CashSessionMapperInput | null | undefined,
): CashSessionDto | null => (model == null ? null : toCashSessionDto(model));

export const toCashSessionStatsItemDto = (
  value: CashSessionStatsItemDto,
): CashSessionStatsItemDto => value;
