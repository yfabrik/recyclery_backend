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
    queryOptions,
  );

  const giftCardTransactionModel = giftCard.sequelize.models.GiftCardTransaction;
  if (!giftCardTransactionModel) {
    throw new Error("GiftCardTransaction model not found");
  }

  const movementSum =
    (await giftCardTransactionModel.sum("amount", {
      where: { gift_card_id: giftCardId },
      ...queryOptions,
    })) || 0;

  const initialValue = toAmount(giftCard.initial_value);
  const normalizedMovementSum = toAmount(movementSum);

  return {
    giftCard,
    initialValue,
    movementSum: normalizedMovementSum,
    // Ledger is source of truth: issue movement seeds initial value.
    currentBalance: normalizedMovementSum,
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
