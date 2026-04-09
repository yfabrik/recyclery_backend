import createHttpError from "http-errors";
import {
  Op,
  type FindOptions,
  type Identifier,
  type WhereAttributeHashValue
} from "sequelize";
import type { ModelClass } from "./models/db-types.js";

export const formatWhereDateRange = (dateFrom?: Date, dateTo?: Date) => {
  let from = dateFrom
    ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0))
    : undefined;
  let to = dateTo
    ? new Date(new Date(dateTo).setHours(23, 59, 59, 999))
    : undefined;

  let result = {}; //as WhereAttributeHashValue<Date>
  if (from) result = { ...result, [Op.gte]: from };
  if (to) result = { ...result, [Op.lte]: to };
  return result as WhereAttributeHashValue<Date>;
};

export const ensureItemWithIdExist = async <
  T extends ModelClass,
>(
  model: T,
  id: Identifier,
  options?: Omit<FindOptions<T>, "where">,
) => {
  const item = await model.findByPk(id, options);
  if (!item) throw new createHttpError.NotFound(`${model.name} pas trouvé`);
  return item;
};
