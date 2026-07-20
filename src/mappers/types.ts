import type { Attributes, Model } from "sequelize";

/** Accept a Sequelize instance or its plain attribute object (nested includes). */
export type MapperInput<T extends Model> = T | Attributes<T>;

export type OptionalMapperInput<T extends Model> =
  | MapperInput<T>
  | null
  | undefined;

/** Keys whose values may be undefined (optional or union-with-undefined). */
type UndefinedKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/** Keys always present after stripping undefined values. */
type RequiredKeys<T> = Exclude<keyof T, UndefinedKeys<T>>;

/** DTO-safe output: required keys keep their type; optional keys drop `undefined`. */
export type StripUndefined<T extends Record<string, unknown>> =
  { [K in RequiredKeys<T>]: T[K] } &
  { [K in UndefinedKeys<T>]?: Exclude<T[K], undefined> };

/** Omit keys whose values are `undefined` (for exactOptionalPropertyTypes DTOs). */
export const stripUndefined = <T extends Record<string, unknown>>(value: T) => {
  const result = {} as Record<string, unknown>;
  for (const [key, field] of Object.entries(value)) {
    if (field !== undefined) result[key] = field;
  }
  return result as StripUndefined<T>;
};
