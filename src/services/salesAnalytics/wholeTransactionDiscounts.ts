import type { StoredWholeTransactionDiscount } from "@recyclerie/api/domain/notableDiscounts";
import z from "zod";
import { PROMOTION_TYPES } from "../../constants/dbEnums.js";
import db from "../../models/index.js";
import { numberColumn, parseRawRows } from "./rawRows.js";
import { transactionInclude, type LoadScope } from "./scope.js";

const { TransactionGlobalPromotion } = db;

/** A `TransactionGlobalPromotion` row of `loadWholeTransactionDiscounts`. */
const wholeTransactionDiscountRow = z.object({
  transaction_id: numberColumn,
  type: z.enum(PROMOTION_TYPES).nullable(),
  value: numberColumn.nullable(),
});

/**
 * The whole-transaction discount (`TransactionGlobalPromotion`, type + value)
 * of each transaction in scope that has one, by transaction id. Only Sales get
 * one. When there are several, the first is kept, as the till's
 * `global_promotion` does. It holds no amount: that is
 * `total_amount_before_promotion − total_amount`.
 */
export const loadWholeTransactionDiscounts = async (
  scope: LoadScope,
): Promise<Map<number, StoredWholeTransactionDiscount>> => {
  const rows = await TransactionGlobalPromotion.findAll({
    attributes: ["transaction_id", "type", "value"],
    include: [transactionInclude(scope)],
    order: [["id", "ASC"]],
    raw: true,
  });
  const discounts = new Map<number, StoredWholeTransactionDiscount>();
  for (const { transaction_id, type, value } of parseRawRows(wholeTransactionDiscountRow, rows)) {
    if (!discounts.has(transaction_id)) discounts.set(transaction_id, { type, value });
  }
  return discounts;
};
