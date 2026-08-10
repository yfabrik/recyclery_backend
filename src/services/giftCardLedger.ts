import type { Transaction } from "sequelize";
import type { GiftCardStatus } from "../constants/dbEnums.js";
import type { Models } from "../models/db-types.js";
import GiftCard from "../models/giftcard.js";
import { findByPkOrThrow } from "./sequelize.js";

export const toAmount = (value?: number | string | null) =>
  Number.parseFloat(String(value ?? 0));

export const getGiftCardBalanceInTx = async (
  giftCardId: Models["GiftCard"]["id"],
  transaction: Transaction | null,
) => {
  const queryOptions = transaction ? { transaction } : {};
  const giftCard = await findByPkOrThrow(
    GiftCard,
    giftCardId,
    "gift card not found",
    {
      ...queryOptions,
      // Needed for current_value virtual (initial_value + non-issue movements).
      // Do not reload afterward — reload drops associations.
      include: [{ association: "movements", required: false }],
    },
  );

  const initialValue = toAmount(giftCard.initial_value);
  const currentBalance = toAmount(giftCard.current_value);

  return {
    giftCard,
    initialValue,
    // Status rules compare ledger total to initial_value.
    movementSum: currentBalance,
    currentBalance,
  };
};

export const computeGiftCardStatus = (
  giftCard: Models["GiftCard"],
  initialValue: number,
  movementSum: number,
): GiftCardStatus => {
  if (giftCard.status === "cancelled") {
    return "cancelled";
  }
  if (giftCard.expires_at && giftCard.expires_at < new Date()) {
    return "expired";
  }
  if (movementSum <= 0) {
    return "redeemed";
  }
  if (movementSum > 0 && movementSum < initialValue) {
    return "partially_used";
  }
  return "active";
};

export const syncGiftCardStatus = async (
  giftCardId: Models["GiftCard"]["id"],
  transaction: Transaction | null,
) => {
  const { giftCard, initialValue, movementSum } = await getGiftCardBalanceInTx(
    giftCardId,
    transaction,
  );
  const nextStatus = computeGiftCardStatus(giftCard, initialValue, movementSum);
  const queryOptions = transaction ? { transaction } : {};

  await giftCard.update({ status: nextStatus }, queryOptions);

  return giftCard;
};
