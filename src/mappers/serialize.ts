export type JsonRecord = Record<string, unknown>;

export const toIsoDate = (value: Date | string | null | undefined): string => {
  if (value == null) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

export const toOptionalIsoDate = (
  value: Date | string | null | undefined,
): string | undefined => {
  if (value == null) return undefined;
  return toIsoDate(value);
};

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
