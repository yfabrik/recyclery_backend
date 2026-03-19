import createHttpError from "http-errors";
import { Op } from "sequelize";
import db from "../models/index.js";

const { GiftCard, GiftCardTransaction, sequelize } = db;

/**
 * @param {number|string|null|undefined} value
 */
const toAmount = (value) => Number.parseFloat(String(value ?? 0));

/**
 * @param {number} giftCardId
 * @param {import("sequelize").Transaction} transaction
 */
const getGiftCardBalanceInTx = async (giftCardId, transaction) => {
  const giftCard = await GiftCard.findByPk(giftCardId, { transaction });
  if (!giftCard) throw new createHttpError.NotFound("gift card not found");

  const movementSum =
    (await GiftCardTransaction.sum("amount", {
      where: { gift_card_id: giftCardId },
      transaction,
    })) || 0;

  return {
    giftCard,
    initialValue: toAmount(giftCard.initial_value),
    movementSum: toAmount(movementSum),
    currentBalance: toAmount(giftCard.initial_value) + toAmount(movementSum),
  };
};

/**
 * @param {import("../models/types/giftCardModel.js").GiftCardInstance} giftCard
 */
const assertGiftCardUsable = (giftCard) => {
  if (giftCard.status === "cancelled") {
    throw new createHttpError.BadRequest("gift card is cancelled");
  }
  if (giftCard.status === "expired") {
    throw new createHttpError.BadRequest("gift card is expired");
  }
  if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
    throw new createHttpError.BadRequest("gift card is expired");
  }
};

/**
 * Create a gift card and insert the initial issue movement.
 * @param {{
 *  code: string;
 *  initialValue: number|string;
 *  expiresAt?: Date|string|null;
 *  issuedTransactionId?: number|null;
 *  issuedRefundTransactionId?: number|null;
 *  createdBy?: number|null;
 *  note?: string|null;
 *  recipientName?: string|null;
 *  recipientEmail?: string|null;
 *  metadata?: object|null;
 *  transaction?: import("sequelize").Transaction|null;
 * }} params
 */
export const issueGiftCard = async ({
  code,
  initialValue,
  expiresAt = null,
  issuedTransactionId = null,
  issuedRefundTransactionId = null,
  createdBy = null,
  note = null,
  recipientName = null,
  recipientEmail = null,
  metadata = null,
  transaction: externalTransaction = null,
}) => {
  const amount = toAmount(initialValue);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new createHttpError.BadRequest("initial gift card value must be >= 0");
  }
  const linkedTransactionId = issuedTransactionId || issuedRefundTransactionId;
  if (!linkedTransactionId) {
    throw new createHttpError.BadRequest(
      "gift card issuance requires a linked sales transaction id",
    );
  }

  /** @param {import("sequelize").Transaction} transaction */
  const run = async (transaction) => {
    const giftCard = await GiftCard.create(
      {
        code,
        initial_value: amount,
        expires_at: expiresAt,
        issued_transaction_id: issuedTransactionId,
        issued_refund_transaction_id: issuedRefundTransactionId,
        created_by: createdBy,
        note,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
      },
      { transaction },
    );

    await GiftCardTransaction.create(
      {
        gift_card_id: giftCard.id,
        sales_transaction_id: linkedTransactionId,
        type: "issue",
        amount,
        created_by: createdBy,
        metadata,
      },
      { transaction },
    );

    return giftCard;
  };

  if (externalTransaction) return run(externalTransaction);
  return sequelize.transaction(run);
};

/**
 * Retrieve current balance from immutable initial value + movements ledger.
 * @param {number} giftCardId
 * @param {{ transaction?: import("sequelize").Transaction }} [options]
 */
export const getGiftCardBalance = async (giftCardId, options = {}) => {
  if (options.transaction) {
    return getGiftCardBalanceInTx(giftCardId, options.transaction);
  }
  return sequelize.transaction((transaction) =>
    getGiftCardBalanceInTx(giftCardId, transaction),
  );
};

/**
 * Debit gift card for a sale transaction.
 * @param {{
 *  giftCardId: number;
 *  salesTransactionId: number;
 *  amount: number|string;
 *  createdBy?: number|null;
 *  metadata?: object|null;
 *  transaction?: import("sequelize").Transaction|null;
 * }} params
 */
export const chargeGiftCard = async ({
  giftCardId,
  salesTransactionId,
  amount,
  createdBy = null,
  metadata = null,
  transaction: externalTransaction = null,
}) => {
  const debit = toAmount(amount);
  if (!Number.isFinite(debit) || debit <= 0) {
    throw new createHttpError.BadRequest("charge amount must be > 0");
  }

  /** @param {import("sequelize").Transaction} transaction */
  const run = async (transaction) => {
    const { giftCard, currentBalance } = await getGiftCardBalanceInTx(
      giftCardId,
      transaction,
    );
    assertGiftCardUsable(giftCard);

    if (currentBalance < debit) {
      throw new createHttpError.BadRequest("insufficient gift card balance");
    }

    return GiftCardTransaction.create(
      {
        gift_card_id: giftCardId,
        sales_transaction_id: salesTransactionId,
        type: "charge",
        amount: -debit,
        created_by: createdBy,
        metadata,
      },
      { transaction },
    );
  };
  if (externalTransaction) return run(externalTransaction);
  return sequelize.transaction(run);
};

/**
 * Credit gift card from refund flow.
 * @param {{
 *  giftCardId: number;
 *  salesTransactionId: number;
 *  amount: number|string;
 *  createdBy?: number|null;
 *  metadata?: object|null;
 *  transaction?: import("sequelize").Transaction|null;
 * }} params
 */
export const recreditGiftCard = async ({
  giftCardId,
  salesTransactionId,
  amount,
  createdBy = null,
  metadata = null,
  transaction: externalTransaction = null,
}) => {
  const credit = toAmount(amount);
  if (!Number.isFinite(credit) || credit <= 0) {
    throw new createHttpError.BadRequest("recredit amount must be > 0");
  }

  /** @param {import("sequelize").Transaction} transaction */
  const run = async (transaction) => {
    const giftCard = await GiftCard.findByPk(giftCardId, { transaction });
    if (!giftCard) throw new createHttpError.NotFound("gift card not found");
    assertGiftCardUsable(giftCard);

    return GiftCardTransaction.create(
      {
        gift_card_id: giftCardId,
        sales_transaction_id: salesTransactionId,
        type: "refund_recredit",
        amount: credit,
        created_by: createdBy,
        metadata,
      },
      { transaction },
    );
  };
  if (externalTransaction) return run(externalTransaction);
  return sequelize.transaction(run);
};

/**
 * @param {string} code
 * @param {{ transaction?: import("sequelize").Transaction }} [options]
 */
export const findGiftCardByCode = async (code, options = {}) =>
  GiftCard.findOne({
    where: {
      code: { [Op.eq]: code },
    },
    ...(options.transaction ? { transaction: options.transaction } : {}),
  });
