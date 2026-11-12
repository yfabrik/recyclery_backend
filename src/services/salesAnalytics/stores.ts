import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";

const { Recyclery } = db;

/** A Store, as the analytics routes list or name it. */
export type AnalyticsStore = {
  id: Models["Recyclery"]["id"];
  name: string;
  isActive: boolean;
};

/** Every Store, inactive ones included (they may hold past Sales), by id. There are few. */
export const loadStores = async (): Promise<AnalyticsStore[]> => {
  const stores = await Recyclery.findAll({
    attributes: ["id", "name", "is_active"],
    order: [["id", "ASC"]],
  });
  return stores.map((store) => ({ id: store.id, name: store.name, isActive: store.is_active }));
};
