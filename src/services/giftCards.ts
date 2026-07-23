import createHttpError from "http-errors";
import {
  Op,
  Transaction,
  type CreateOptions,
  type FindOptions,
} from "sequelize";
import type { Models } from "../models/db-types.js";
import db from "../models/index.js";
import { withTransaction } from "../utils/transaction.js";
import { getGiftCardBalanceInTx, toAmount } from "./giftCardLedger.js";
import { findByPkOrThrow } from "./sequelize.js";

const { GiftCard, GiftCardTransaction, CashSession, SalesTransaction, sequelize } = db;

const assertGiftCardUsable = (giftCard: Models["GiftCard"]) => {
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
type GiftCreate = {
  code?: string;
  initialValue: number;
  expiresAt?: Date | string | null;
  issuedTransactionId?: Models["SalesTransaction"]["id"] | null;
  issuedRefundTransactionId?: Models["SalesTransaction"]["id"] | null;
  createdBy: Models["User"]["id"];
  note?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const issueGiftCard = async ({
  code,
  initialValue,
  expiresAt = null,
  issuedTransactionId = null,
  issuedRefundTransactionId = null,
  createdBy,
  note = null,
  recipientName = null,
  recipientEmail = null,
  metadata = null,
  transaction: externalTransaction = null,
}: GiftCreate & { transaction?: Transaction | null }) => {
  const amount = toAmount(initialValue);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new createHttpError.BadRequest(
      "initial gift card value must be >= 0",
    );
  }
  let linkedTransactionId = issuedTransactionId || issuedRefundTransactionId;
  if (!linkedTransactionId) {
    const openedSession = await CashSession.findOne({
      where: {
        status: "open",
        user_id: createdBy,
      },
    });
    if (!openedSession)
      throw new createHttpError.BadRequest(
        "gift card issuance requires a linked sales transaction id",
      );

  }

  return withTransaction(sequelize, externalTransaction, async (transaction) => {
    if (!linkedTransactionId) {
      //TODO a refaire
      const openedSession = await CashSession.findOne({
        where: {
          status: "open",
          user_id: createdBy,
        },
      });
      if (!openedSession) throw new createHttpError.BadRequest(
        "gift card issuance requires a linked sales transaction id",
      );
      linkedTransactionId = (await SalesTransaction.create({
        cash_session_id: openedSession.id,
        payment_method: "cash",
        created_by: createdBy,
        total_amount_before_promotion: amount,
        total_amount: amount,
        payment_amount: amount,
        transactionType: "sell",
      }, { transaction })).id;
    }
    const giftCard = await GiftCard.create(
      {
        ...(code != null ? { code } : {}),
        initial_value: amount,
        expires_at: expiresAt != null ? new Date(expiresAt) : null,
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
  });
};

/**
 * True if the card has any non-issue ledger movement or a payment usage.
 */
export const isGiftCardUsed = async (
  giftCardId: Models["GiftCard"]["id"],
  options?: { transaction?: Transaction | null },
) => {
  const t = options?.transaction ?? null;
  const nonIssue = await GiftCardTransaction.count({
    where: {
      gift_card_id: giftCardId,
      type: { [Op.ne]: "issue" },
    },
    transaction: t,
  });
  if (nonIssue > 0) return true;

  const { TransactionPayment } = db;
  const payments = await TransactionPayment.count({
    where: { gift_card_id: giftCardId },
    transaction: t,
  });
  return payments > 0;
};

/**
 * Retrieve current balance from immutable initial value + movements ledger.
 * @param  giftCardId
 * @param  [options]
 */
export const getGiftCardBalance = async (
  giftCardId: Models["GiftCard"]["id"],
  options?: CreateOptions,
) =>
  withTransaction(sequelize, options?.transaction, (transaction) =>
    getGiftCardBalanceInTx(giftCardId, transaction),
  );

/**
 * Debit gift card for a sale transaction.
 */

type GiftCharge = {
  giftCardId: Models["GiftCard"]["id"];
  salesTransactionId: Models["SalesTransaction"]["id"];
  amount: number | string;
  createdBy: Models["User"]["id"];
  metadata?: Record<string, unknown> | null;
};
export const chargeGiftCard = async ({
  giftCardId,
  salesTransactionId,
  amount,
  createdBy,
  metadata = null,
  transaction: externalTransaction = null,
}: GiftCharge & { transaction?: Transaction | null }) => {
  const debit = toAmount(amount);
  if (!Number.isFinite(debit) || debit <= 0) {
    throw new createHttpError.BadRequest("charge amount must be > 0");
  }

  return withTransaction(sequelize, externalTransaction, async (transaction) => {
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
  });
};

/**
 * Credit gift card from refund flow.
 */
export const recreditGiftCard = async ({
  giftCardId,
  salesTransactionId,
  amount,
  createdBy,
  metadata = null,
  transaction: externalTransaction = null,
}: GiftCharge & { transaction?: Transaction | null }) => {
  const credit = toAmount(amount);
  if (!Number.isFinite(credit) || credit <= 0) {
    throw new createHttpError.BadRequest("recredit amount must be > 0");
  }

  return withTransaction(sequelize, externalTransaction, async (transaction) => {
    const giftCard = await findByPkOrThrow(
      GiftCard,
      giftCardId,
      "gift card not found",
      { transaction },
    );
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
  });
};

export const findGiftCardByCode = async (
  code: Models["GiftCard"]["code"],
  options: FindOptions = {},
) =>
  GiftCard.findOne({
    where: {
      code: { [Op.eq]: code },
    },
    include: [{ model: GiftCardTransaction, as: "movements", required: false }],
    ...(options.transaction ? { transaction: options.transaction } : {}),
  });
