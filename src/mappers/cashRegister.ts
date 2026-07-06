import type {
  CashRegisterDto,
  CashRegisterSessionRefDto,
  CashSessionRefDto,
} from "@recyclerie/api/responses/cashRegister";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type Recyclery from "../models/recyclery.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDate, toNumber, toOptionalIsoDate, toOptionalNumber } from "./serialize.js";
import type { MapperInput } from "./types.js";

type CashSessionRefInput = MapperInput<CashSession>;

type CashRegisterMapperInput = MapperInput<CashRegister> & {
  Recyclery?: MapperInput<Recyclery> | null;
  sessions?: Array<CashSessionRefInput>;
  store_name?: string | null;
  total_sessions?: number | string;
  last_session?: Date | string | null;
};

const toCashSessionRef = (
  value: CashSessionRefInput,
): CashSessionRefDto | undefined => {
  if (typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    opening_amount: toNumber(value.opening_amount),
    closing_amount: toOptionalNumber(value.closing_amount) ?? null,
    expected_amount: toOptionalNumber(value.expected_amount) ?? null,
    status: value.status,
    notes: value.notes ?? null,
    closed_at: toOptionalIsoDate(value.closed_at) ?? null,
    cash_register_id: value.cash_register_id,
    user_id: value.user_id,
    createdAt: toIsoDate(value.createdAt),
    updatedAt: toIsoDate(value.updatedAt),
  };
};

export const toCashRegisterSessionRefDto = (
  model: CashRegisterMapperInput,
): CashRegisterSessionRefDto => ({
  id: model.id,
  name: model.name,
  is_active: model.is_active,
  recyclery_id: model.recyclery_id,
  Recyclery: toRecycleryRef(model.Recyclery) ?? null,
});

export const toCashRegisterDto = (
  model: CashRegisterMapperInput,
): CashRegisterDto => ({
  id: model.id,
  name: model.name,
  is_active: model.is_active,
  recyclery_id: model.recyclery_id,
  createdAt: toIsoDate(model.createdAt),
  updatedAt: toIsoDate(model.updatedAt),
  store_name: model.store_name ?? null,
  ...(model.total_sessions != null
    ? { total_sessions: model.total_sessions }
    : {}),
  last_session: toOptionalIsoDate(model.last_session) ?? null,
  Recyclery: toRecycleryRef(model.Recyclery) ?? null,
  ...(model.sessions
    ? {
        sessions: model.sessions
          .map(toCashSessionRef)
          .filter((session): session is CashSessionRefDto => session != null),
      }
    : {}),
});

export const toCashRegisterDetailDto = (
  register: CashRegister,
  extras: {
    store_name: string | null;
    total_sessions: number;
    last_session: Date | null;
  },
): CashRegisterDto =>
  toCashRegisterDto({
    id: register.id,
    name: register.name,
    is_active: register.is_active,
    recyclery_id: register.recyclery_id,
    createdAt: register.createdAt,
    updatedAt: register.updatedAt,
    store_name: extras.store_name,
    total_sessions: extras.total_sessions,
    last_session: extras.last_session,
  });
