import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";

const { Recyclery } = db;

/** Every Store's name by id, inactive ones included (they may hold past Sales). */
export const loadStoreNames = async (): Promise<Map<Models["Recyclery"]["id"], string>> => {
  const rows = await Recyclery.findAll({ attributes: ["id", "name"], raw: true });
  return new Map(rows.map((store) => [Number(store.id), store.name]));
};
