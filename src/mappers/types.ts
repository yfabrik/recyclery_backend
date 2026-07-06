import type { Attributes, Model } from "sequelize";

/** Accept a Sequelize instance or its plain attribute object (nested includes). */
export type MapperInput<T extends Model> = T | Attributes<T>;

export type OptionalMapperInput<T extends Model> =
  | MapperInput<T>
  | null
  | undefined;

/** Omit keys whose values are `undefined` (for exactOptionalPropertyTypes DTOs). */
export const stripUndefined = <T extends Record<string, unknown>>(value: T) => {
  const result = {} as Record<string, unknown>;
  for (const [key, field] of Object.entries(value)) {
    if (field !== undefined) result[key] = field;
  }
  return result as {
    [K in keyof T as T[K] extends undefined ? never : K]: T[K];
  };
};
