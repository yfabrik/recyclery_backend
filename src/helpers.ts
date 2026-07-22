import type { IsoDate } from "@recyclerie/api";
import createHttpError from "http-errors";
import {
  Op,
  type FindOptions,
  type Identifier,
  type WhereAttributeHashValue,
} from "sequelize";
import type { ModelClass } from "./models/db-types.js";
import { endOfDay, startOfDay } from "./utils/dates.js";

/** Expand IsoDate (YYYY-MM-DD) filters to Europe/Paris day bounds for datetime columns. */
export const formatWhereDateRange = (
  dateFrom?: IsoDate | string | Date | null,
  dateTo?: IsoDate | string | Date | null,
): WhereAttributeHashValue<Date> | undefined => {
  const from = dateFrom ? startOfDay(dateFrom).toDate() : undefined;
  const to = dateTo ? endOfDay(dateTo).toDate() : undefined;

  if (!from && !to) return undefined;
  let result: WhereAttributeHashValue<Date> = {};
  if (from) result = { ...result, [Op.gte]: from };
  if (to) result = { ...result, [Op.lte]: to };
  return result;
};

export const ensureItemWithIdExist = async <T extends ModelClass>(
  model: T,
  id: Identifier,
  options?: Omit<FindOptions<T>, "where">,
) => {
  const item = await model.findByPk(id, options);
  if (!item) throw new createHttpError.NotFound(`${model.name} pas trouvé`);
  return item;
};
