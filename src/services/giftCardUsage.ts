import { Op, type Transaction } from "sequelize";
import type GiftCard from "../models/giftcard.js";
import GiftCardTransaction from "../models/giftcardtransaction.js";
import type SalesTransaction from "../models/salestransaction.js";
import TransactionPayment from "../models/transactionpayment.js";

// Kept apart from `giftCards.ts` (which loads every model through
// `models/index`) so the SalesTransaction delete hook can use it.

/**
 * True once the card has been used: any ledger movement other than its issue,
 * or any payment line on it.
 *
 * `ignorePaymentsOf` leaves out the payment lines of one transaction: a Refund
 * paid out as a new card records its own payout line on that card, which is
 * not a use when that Refund is the one being deleted.
 */
export const isGiftCardUsed = async (
  giftCardId: GiftCard["id"],
  options: {
    transaction?: Transaction | null;
    ignorePaymentsOf?: SalesTransaction["id"];
  } = {},
): Promise<boolean> => {
  const transaction = options.transaction ?? null;
  const nonIssue = await GiftCardTransaction.count({
    where: { gift_card_id: giftCardId, type: { [Op.ne]: "issue" } },
    transaction,
  });
  if (nonIssue > 0) return true;

  const payments = await TransactionPayment.count({
    where: {
      gift_card_id: giftCardId,
      ...(options.ignorePaymentsOf != null && {
        sales_transaction_id: { [Op.ne]: options.ignorePaymentsOf },
      }),
    },
    transaction,
  });
  return payments > 0;
};
