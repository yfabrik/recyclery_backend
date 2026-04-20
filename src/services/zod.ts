import z from "zod";
import type { ZodTypeAny } from "zod/v3";

/**
 *
 * @param {z.ZodTypeAny} schema
 * @returns
 */
export const nullishToNull = (schema: ZodTypeAny) =>
  schema.nullish().transform((val) => val ?? null);

/**
 *
 * @param {z.ZodTypeAny} schema
 * @returns
 */
export const asOptionalStringWithoutEmpty = (schema: ZodTypeAny) => {
  return schema.optional().or(z.literal("").transform(() => null));
};

export const phoneSchema = (message?: string) =>
  z
    .string({ message })
    .regex(/^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/, { message });

export const postalSchema = (message?: string) =>
  z.string({ message }).regex(/^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/, { message });

export const idSchema = (message?: string) =>
  z.coerce.number({ message }).positive({ message });
