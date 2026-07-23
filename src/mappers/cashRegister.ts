import type {
  CashRegisterDto,
  CashRegisterRefDto,
  CashRegisterSessionRefDto,
} from "@recyclerie/api/responses/cashRegister";

import type CashRegister from "../models/cashregister.js";
import type CashSession from "../models/cashsession.js";
import type Recyclery from "../models/recyclery.js";
import { toCashSessionRef } from "./cashSession.js";
import { toRecycleryRef } from "./refs.js";
import {
  toIsoDateTime,
  toNumber,
  toOptionalIsoDate
} from "./serialize.js";
import type { MapperInput } from "./types.js";
import type { CashSessionRefDto } from "@recyclerie/api";

type CashRegisterMapperInput = MapperInput<CashRegister> & {
  Recyclery?: MapperInput<Recyclery> | null;
  sessions?: Array<MapperInput<CashSession>>;
  store_name?: string | null;
  total_sessions?: number | string;
  last_session?: Date | string | null;
};

/** Base register fields only (nested under recyclery). */
export const toCashRegisterBaseRefDto = (
  model: CashRegisterMapperInput,
): CashRegisterRefDto =>
  ({
    id: model.id,
    name: model.name,
    is_active: model.is_active,
    recyclery_id: model.recyclery_id,
  }) satisfies CashRegisterRefDto;

/** Register ref with optional store, used when nested under a cash session. */
export const toCashRegisterRefDto = (
  model: CashRegisterMapperInput,
): CashRegisterSessionRefDto =>
  ({
    ...toCashRegisterBaseRefDto(model),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
  }) satisfies CashRegisterSessionRefDto;

export const toCashRegisterDto = (
  model: CashRegisterMapperInput,
): CashRegisterDto =>
  ({
    id: model.id,
    name: model.name,
    is_active: model.is_active,
    recyclery_id: model.recyclery_id,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    store_name: model.store_name ?? null,
    ...(model.total_sessions != null
      ? { total_sessions: toNumber(model.total_sessions) }
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
  }) satisfies CashRegisterDto;

/** List/aggregate rows: never serialize the COUNT join as sessions[]. */
export const toCashRegisterListDto = (
  model: CashRegisterMapperInput,
): CashRegisterDto =>
  toCashRegisterDto({
    id: model.id,
    name: model.name,
    is_active: model.is_active,
    recyclery_id: model.recyclery_id,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    store_name: model.store_name ?? null,
    last_session: model.last_session ?? null,
    ...(model.Recyclery !== undefined ? { Recyclery: model.Recyclery } : {}),
    ...(model.total_sessions != null ? { total_sessions: model.total_sessions } : {}),
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
    sessions: register.sessions ?? [],
  });
