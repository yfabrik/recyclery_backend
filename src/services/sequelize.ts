import createHttpError from "http-errors";
import type { Attributes, FindOptions, Model, ModelStatic } from "sequelize";

export async function findByPkOrThrow<T extends Model>(
  model: ModelStatic<T>,
  id: Parameters<ModelStatic<T>["findByPk"]>[0],
  message: string,
  options?: Omit<FindOptions<Attributes<T>>, "where">,
): Promise<T> {
  const record = await model.findByPk(id, options);
  if (!record) throw new createHttpError.NotFound(message);
  return record;
}

/** @alias findByPkOrThrow */
export const getById = findByPkOrThrow;
