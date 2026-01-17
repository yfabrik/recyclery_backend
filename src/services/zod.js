import z from "zod";

/**
 * 
 * @param {z.ZodTypeAny} schema 
 * @returns 
 */
export const nullishToNull = (schema) =>
    schema.nullish().transform((val) => val ?? null);

/**
 * 
 * @param {string} [message] 
 * @returns 
 */
export const phoneSchema = (message) => z.string({ message }).regex(/^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/, { message })
/**
 * 
 * @param {string} [message] 
 * @returns 
 */
export const postalSchema = (message) => z.string({ message }).regex(/^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/, { message })
/**
 * 
 * @param {string} [message] 
 * @returns 
 */
export const idSchema = (message) => z.coerce.number({ message }).positive({ message })