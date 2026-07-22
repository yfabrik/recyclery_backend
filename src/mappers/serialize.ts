import type { IsoDateTime } from "@recyclerie/api";
import {
  toIsoDateTime,
  toOptionalIsoDateTime,
} from "../utils/dates.js";

export type JsonRecord = Record<string, unknown>;

/** @deprecated Prefer toIsoDateTime from utils/dates — kept as UTC ISO alias for mappers. */
export const toIsoDate = (
  value: Date | string | null | undefined,
): IsoDateTime => toIsoDateTime(value);

export const toOptionalIsoDate = (
  value: Date | string | null | undefined,
): IsoDateTime | undefined => toOptionalIsoDateTime(value);

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  return Number(value);
};

export const toOptionalNumber = (
  value: unknown,
): number | null | undefined => {
  if (value == null) return value === null ? null : undefined;
  return toNumber(value);
};

/** Optional aggregate that must not be null on the DTO (omit / undefined only). */
export const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  return toNumber(value);
};

/** App always sets audit user FKs; DTO contract is non-null. */
export const requireUserId = (value: number | null | undefined): number => {
  if (value == null) {
    throw new Error("expected non-null user id on mapped entity");
  }
  return value;
};

export { toIsoDateTime, toOptionalIsoDateTime };
