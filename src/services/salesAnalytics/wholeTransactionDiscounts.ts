import type { StoredWholeTransactionDiscount } from "@recyclerie/api/domain/notableDiscounts";
import type { PromotionType } from "../../constants/dbEnums.js";
import db from "../../models/index.js";
import { transactionInclude, type LoadScope } from "./scope.js";

const { TransactionGlobalPromotion } = db;

type WholeTransactionDiscountRow = {
  transaction_id: number | string;
  type: PromotionType | null;
  value: number | string | null;
};

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
  const rows = (await TransactionGlobalPromotion.findAll({
    attributes: ["transaction_id", "type", "value"],
    include: [transactionInclude(scope)],
    order: [["id", "ASC"]],
    raw: true,
  })) as unknown as WholeTransactionDiscountRow[];
  const discounts = new Map<number, StoredWholeTransactionDiscount>();
  for (const row of rows) {
    const transactionId = Number(row.transaction_id);
    if (!discounts.has(transactionId))
      discounts.set(transactionId, { type: row.type, value: row.value });
  }
  return discounts;
};
