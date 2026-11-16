import { Op } from "sequelize";
import db from "../models/index.js";
import { saleLineInclude } from "../models/transactionitem.js";

const { SalesTransaction, TransactionItem } = db;

/** Keeps each `IN (...)` list well under SQLite's bound-parameter limit. */
const CHUNK_SIZE = 500;

/**
 * The Sale of each labeled item: the most recent Sale that lists it (see
 * `saleLineInclude`). Items with no Sale are absent from the map.
 */
export const findSaleIdsByItem = async (
  itemIds: readonly number[],
): Promise<Map<number, number>> => {
  const saleIds = new Map<number, number>();
  const ids = [...new Set(itemIds)];

  for (let start = 0; start < ids.length; start += CHUNK_SIZE) {
    const lines = await TransactionItem.findAll({
      attributes: ["labeled_item_id", "transaction_id"],
      where: { labeled_item_id: { [Op.in]: ids.slice(start, start + CHUNK_SIZE) } },
      include: [saleLineInclude({ attributes: ["id", "createdAt"] })],
      order: [
        [SalesTransaction, "createdAt", "DESC"],
        [SalesTransaction, "id", "DESC"],
      ],
    });
    for (const line of lines) {
      if (!saleIds.has(line.labeled_item_id))
        saleIds.set(line.labeled_item_id, line.transaction_id);
    }
  }

  return saleIds;
};
