import { roundCurrency } from "@recyclerie/api/domain/cart";
import type {
  GiftCardAnalyticsDto,
  GiftCardFigureDto,
} from "@recyclerie/api/responses/giftCards";
import { Op, col } from "sequelize";
import type {
  GiftCardStatus,
  GiftCardTransactionType,
  SalesTransactionStatus,
  TransactionType,
} from "../../constants/dbEnums.js";
import db from "../../models/index.js";
import type { UtcBounds } from "./ranges.js";
import { storeInclude, type LoadScope } from "./scope.js";

/*
 * Gift card figures, from the ledger (`giftcard_transactions`) as it is
 * actually written:
 *
 * - Every movement is tied to a sales transaction, whose own cash session
 *   gives its Store. The period figures (issued by origin, used) count only
 *   the movements of `completed` transactions: `pending` and `cancelled` are
 *   excluded everywhere. Balances (expired, outstanding) keep every movement,
 *   whatever its transaction's status: they are the card's own ledger
 *   balance (`current_value`), what the card is really worth at the till.
 * - A card created by hand on the Gift card page has no `issue` movement: it
 *   is dated `issued_at` and worth `initial_value`.
 * - An `issue` or `refund_recredit` movement on a `refund` is store credit; on
 *   a `sell` (lineless: not a Sale for the other sections) it is a card sold
 *   through a Sale, or a top-up from the Gift card page.
 * - No `expire` movement is ever written: a card expires at its `expires_at`.
 * - Cancelling writes no movement and keeps no date: see `cancelledBefore`.
 */

const { GiftCard, GiftCardTransaction, SalesTransaction } = db;

/** A gift card, as plain values. */
export type LedgerCard = {
  id: number;
  initialValue: number;
  issuedAt: Date;
  expiresAt: Date | null;
  status: GiftCardStatus;
  updatedAt: Date;
};

/** A gift card movement, with the transaction it is tied to. */
export type LedgerMovement = {
  giftCardId: number;
  type: GiftCardTransactionType;
  /** Signed: `charge` is negative. */
  amount: number;
  occurredAt: Date;
  /** Tells a top-up (`refund_recredit` on a sell) from store credit (on a Refund). */
  transactionType: TransactionType;
  /** Only the movements of `completed` transactions count in the period figures. */
  transactionStatus: SalesTransactionStatus;
  /** The Store of the transaction's own cash session. */
  storeId: number;
};

export type GiftCardLedger = { cards: LedgerCard[]; movements: LedgerMovement[] };

type CardRow = {
  id: number | string;
  initial_value: number | string;
  issued_at: string | Date;
  expires_at: string | Date | null;
  status: GiftCardStatus;
  updatedAt: string | Date;
};

type MovementRow = {
  giftCardId: number | string;
  type: GiftCardTransactionType;
  amount: number | string;
  occurredAt: string | Date;
  transactionType: TransactionType;
  transactionStatus: SalesTransactionStatus;
  storeId: number | string;
};

/**
 * Every gift card, and every movement before `before` (plus every `issue`
 * movement, which dates its card). Balances need the whole history, so this
 * is not cut at the start of the range; there are few gift cards.
 */
export const loadGiftCardLedger = async (before: Date): Promise<GiftCardLedger> => {
  const [cardRows, movementRows] = await Promise.all([
    GiftCard.findAll({
      attributes: ["id", "initial_value", "issued_at", "expires_at", "status", "updatedAt"],
      raw: true,
    }) as unknown as Promise<CardRow[]>,
    GiftCardTransaction.findAll({
      attributes: [
        [col("GiftCardTransaction.gift_card_id"), "giftCardId"],
        "type",
        "amount",
        [col("GiftCardTransaction.occurred_at"), "occurredAt"],
        [col("SalesTransaction.transactionType"), "transactionType"],
        [col("SalesTransaction.status"), "transactionStatus"],
        [col("SalesTransaction.CashSession.CashRegister.recyclery_id"), "storeId"],
      ],
      where: { [Op.or]: [{ occurred_at: { [Op.lt]: before } }, { type: "issue" }] },
      include: [
        {
          model: SalesTransaction,
          required: true,
          attributes: [],
          include: [storeInclude(null)],
        },
      ],
      raw: true,
    }) as unknown as Promise<MovementRow[]>,
  ]);
  return {
    // SQLite returns dates as the text it stores, MariaDB as Dates.
    cards: cardRows.map((row) => ({
      id: Number(row.id),
      initialValue: Number(row.initial_value),
      issuedAt: new Date(row.issued_at),
      expiresAt: row.expires_at == null ? null : new Date(row.expires_at),
      status: row.status,
      updatedAt: new Date(row.updatedAt),
    })),
    movements: movementRows.map((row) => ({
      giftCardId: Number(row.giftCardId),
      type: row.type,
      amount: Number(row.amount),
      occurredAt: new Date(row.occurredAt),
      transactionType: row.transactionType,
      transactionStatus: row.transactionStatus,
      storeId: Number(row.storeId),
    })),
  };
};

const inBounds = (instant: Date, { start, end }: UtcBounds) =>
  instant >= start && instant < end;

const figure = (amounts: number[]): GiftCardFigureDto => ({
  count: amounts.length,
  amount: roundCurrency(amounts.reduce((total, amount) => total + amount, 0)),
});

/**
 * Balances of the cards through time, from the ledger: a card holds its
 * initial value from its issue, plus every non-issue movement so far.
 */
const cardHistory = (ledger: GiftCardLedger) => {
  const issueDates = new Map<number, Date>();
  const movementsByCard = new Map<number, LedgerMovement[]>();
  for (const m of ledger.movements) {
    if (m.type === "issue") {
      issueDates.set(m.giftCardId, m.occurredAt);
    } else {
      movementsByCard.set(m.giftCardId, [...(movementsByCard.get(m.giftCardId) ?? []), m]);
    }
  }
  return {
    /** Created by hand on the Gift card page: no `issue` movement. */
    isByHand: (card: LedgerCard) => !issueDates.has(card.id),
    /** Its `issue` movement, else (created by hand) `issued_at`. */
    issuedAt: (card: LedgerCard) => issueDates.get(card.id) ?? card.issuedAt,
    /**
     * Balance just before `instant`, rounded to the cent. Never adds the
     * `issue` movement, which repeats the initial value.
     */
    balanceAt: (card: LedgerCard, instant: Date) =>
      roundCurrency(
        (movementsByCard.get(card.id) ?? [])
          .filter((m) => m.occurredAt < instant)
          .reduce((balance, m) => balance + m.amount, card.initialValue),
      ),
    /**
     * Cancelling writes no movement and keeps no date: the card's last update
     * stands for it, since a cancelled card takes no further movement.
     */
    cancelledBefore: (card: LedgerCard, instant: Date) =>
      card.status === "cancelled" && card.updatedAt < instant,
  };
};

/**
 * Gift card figures of one range. With a Store, only the movements are
 * filtered (through their transaction's Store); cards created by hand,
 * expiries and the outstanding balance are network-wide. Expiries and the
 * outstanding balance read the whole ledger; the other figures only the
 * movements of completed transactions.
 */
export const giftCardFigures = (
  ledger: GiftCardLedger,
  { bounds, storeId }: LoadScope,
): GiftCardAnalyticsDto => {
  const history = cardHistory(ledger);
  const byHand = ledger.cards.filter(
    (card) => history.isByHand(card) && inBounds(card.issuedAt, bounds),
  );
  // No `expire` movement is ever written: a card expires at its `expires_at`,
  // losing what is left on it, unless it was cancelled before.
  const expired = ledger.cards.flatMap((card) => {
    const at = card.expiresAt;
    if (!at || !inBounds(at, bounds)) return [];
    if (history.issuedAt(card) >= at || history.cancelledBefore(card, at)) return [];
    const left = history.balanceAt(card, at);
    return left > 0 ? [left] : [];
  });
  // At the end of the range: issued, not expired, not cancelled.
  const outstanding = ledger.cards.flatMap((card) => {
    const at = bounds.end;
    if (history.issuedAt(card) >= at || history.cancelledBefore(card, at)) return [];
    if (card.expiresAt && card.expiresAt < at) return [];
    const left = history.balanceAt(card, at);
    return left > 0 ? [left] : [];
  });
  const inScope = ledger.movements.filter(
    (m) =>
      m.transactionStatus === "completed" &&
      inBounds(m.occurredAt, bounds) &&
      (storeId == null || m.storeId === storeId),
  );
  const amounts = (type: GiftCardTransactionType, transactionType: TransactionType) =>
    inScope
      .filter((m) => m.type === type && m.transactionType === transactionType)
      .map((m) => m.amount);
  return {
    issued: {
      by_hand: figure(byHand.map((card) => card.initialValue)),
      sold: figure(amounts("issue", "sell")),
      store_credit: figure([
        ...amounts("issue", "refund"),
        ...amounts("refund_recredit", "refund"),
      ]),
      top_up: figure(amounts("refund_recredit", "sell")),
    },
    used: figure(
      inScope.filter((m) => m.type === "charge").map((m) => -m.amount),
    ),
    expired: figure(expired),
    outstanding: figure(outstanding),
  };
};
