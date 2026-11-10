import z from "zod";

/*
 * Parsing of `raw: true` query rows. Sequelize types such rows as model
 * instances, but they hold only the selected columns and aliases, as each
 * dialect returns them: DECIMALs are numbers on SQLite and strings on
 * MariaDB; dates are the text SQLite stores, or Dates on MariaDB.
 */

/** A DECIMAL, integer or id column, as a number. */
export const numberColumn = z.coerce.number();

/** A date column, as a Date (`new Date` reads SQLite's text and MariaDB's Date alike). */
export const dateColumn = z.coerce.date();

/**
 * The rows of a `raw: true` query, parsed and normalised by `schema`. A row
 * that does not fit is a server fault (500), so this never lets a ZodError
 * out: the error handler would answer it with a 400.
 */
export const parseRawRows = <T>(schema: z.ZodType<T>, rows: readonly unknown[]): T[] => {
  const parsed = z.array(schema).safeParse(rows);
  if (!parsed.success) {
    throw new Error(`Unexpected sales analytics row: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};
