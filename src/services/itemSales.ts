import { Op } from "sequelize";
import db from "../models/index.js";

const { SalesTransaction, TransactionItem } = db;

/** Keeps each `IN (...)` list well under SQLite's bound-parameter limit. */
const CHUNK_SIZE = 500;

/**
 * The Sale of each labeled item: the most recent Sale (completed `sell`)
 * that lists it. Refunds, pending and cancelled transactions never count.
 * Items with no Sale are absent from the map.
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
      include: [
        {
          model: SalesTransaction,
          attributes: ["id", "createdAt"],
          where: { transactionType: "sell", status: "completed" },
          required: true,
        },
      ],
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
