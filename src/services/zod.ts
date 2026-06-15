import z from "zod";
import type { ZodTypeAny } from "zod/v3";

export const nullishToNull = (schema: ZodTypeAny) =>
  schema.nullish().transform((val) => val ?? null);

// export const asOptionalStringWithoutEmpty = (schema: ZodTypeAny) => {
//   return schema.optional().or(z.literal("").transform(() => null));
// };

export const phoneSchema = (message?: string) =>
  z
    .string({ message })
    .regex(/^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/, { message });

export const postalSchema = (message?: string) =>
  z.string({ message }).regex(/^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/, { message });

export const idSchema = (message?: string) =>
  z.coerce.number({ message }).positive({ message });

export const enumSchema = <const T extends readonly [string, ...string[]]>(
  values: T,
  message?: string,
) => (message ? z.enum(values, message) : z.enum(values));
