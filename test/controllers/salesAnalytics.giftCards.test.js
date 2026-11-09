import { beforeAll, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../src/middlewares/errorHandler";
import db from "../../src/models/index";
import {
  chargeGiftCard,
  issueGiftCard,
  recreditGiftCard,
} from "../../src/services/giftCards";
import { router } from "../../src/v1/routes/giftCards";
import {
  createCategory,
  createStore,
  recordLinelessSell,
  recordRefund,
  recordSale,
} from "../fixtures/salesAnalytics.js";

const { GiftCard, GiftCardTransaction } = db;

const app = express();
app.use("/gift-cards", router);
app.use(errorHandler);

const getGiftCards = (query) =>
  request(app).get("/gift-cards/analytics").query(query);

const FEB_2024 = { date_from: "2024-02-01", date_to: "2024-02-29", period: "month" };

let category;
let orgelet;
let lons;

const backdateMovement = (card, transaction, at) =>
  GiftCardTransaction.update(
    { occurred_at: new Date(at) },
    { where: { gift_card_id: card.id, sales_transaction_id: transaction.id } },
  );

/** Created on the Gift card page: a card, no movement. */
async function cardByHand({ cashier }, { at, value }) {
  const card = await issueGiftCard({ initialValue: value, createdBy: cashier.id });
  await GiftCard.update({ issued_at: new Date(at) }, { where: { id: card.id } });
  return card;
}

/** Sold through a Sale: a lineless sell and an `issue` movement on it. */
async function soldCard({ session, cashier }, { at, value }) {
  const sell = await recordLinelessSell(session, { at, amount: value });
  const card = await issueGiftCard({
    initialValue: value,
    issuedTransactionId: sell.id,
    createdBy: cashier.id,
  });
  await GiftCard.update({ issued_at: new Date(at) }, { where: { id: card.id } });
  await backdateMovement(card, sell, at);
  return card;
}

/** A Sale of one item at `price`, so that it can be refunded. */
const saleOf = ({ session }, { at, price }) =>
  recordSale(session, { at, lines: [{ price, category }] });

/** A Refund paid out as a new card: `issue` movement on the Refund. */
async function storeCreditCard({ session, cashier }, { at, sold }) {
  const { refund } = await recordRefund(session, {
    at,
    sale: sold.sale,
    lines: [{ item: sold.items[0] }],
    method: "giftcard",
  });
  const card = await issueGiftCard({
    initialValue: Number(refund.total_amount),
    issuedRefundTransactionId: refund.id,
    createdBy: cashier.id,
  });
  await GiftCard.update({ issued_at: new Date(at) }, { where: { id: card.id } });
  await backdateMovement(card, refund, at);
  return card;
}

/** A Refund credited onto an existing card: `refund_recredit` movement on the Refund. */
async function refundOnto(card, { session, cashier }, { at, sold }) {
  const { refund } = await recordRefund(session, {
    at,
    sale: sold.sale,
    lines: [{ item: sold.items[0] }],
    method: "giftcard",
  });
  await recreditGiftCard({
    giftCardId: card.id,
    salesTransactionId: refund.id,
    amount: Number(refund.total_amount),
    createdBy: cashier.id,
  });
  await backdateMovement(card, refund, at);
}

/** A top-up from the Gift card page: `refund_recredit` movement on a lineless sell. */
async function topUp(card, { session, cashier }, { at, amount }) {
  const sell = await recordLinelessSell(session, { at, amount });
  await recreditGiftCard({
    giftCardId: card.id,
    salesTransactionId: sell.id,
    amount,
    createdBy: cashier.id,
  });
  await backdateMovement(card, sell, at);
}

/** A Sale paid with the card: `charge` movement on the Sale. */
async function payWith(card, { session, cashier }, { at, amount }) {
  const { sale } = await recordSale(session, {
    at,
    lines: [{ price: amount, category }],
    payments: [{ method: "giftcard", amount }],
  });
  await chargeGiftCard({
    giftCardId: card.id,
    salesTransactionId: sale.id,
    amount,
    createdBy: cashier.id,
  });
  await backdateMovement(card, sale, at);
}

// Set once the card has been used: the till refuses a card past its expiry.
const expireOn = (card, at) =>
  GiftCard.update({ expires_at: new Date(at) }, { where: { id: card.id } });

// Cancelling only sets the status; the card keeps no date but `updatedAt`.
const cancelOn = (card, at) =>
  GiftCard.update(
    { status: "cancelled", updatedAt: new Date(at) },
    { where: { id: card.id }, silent: true },
  );

/*
 * February 2024. Two Stores, Orgelet and Lons.
 *
 * A  by hand 50 (10 Jan)   paid 20 at Orgelet (5 Feb), Refund at Orgelet
 *                          credited onto it 6 (12 Feb)             → 36 left
 * B  by hand 40 (15 Jan)   paid 15 at Lons (20 Jan), expires 20 Feb
 *                          with 25 left                             →  0
 * C  by hand 30 (31 Jan 23:30 UTC = 1 Feb Paris), topped up 10 at Lons
 *                          (8 Feb), paid 10 at Lons on 29 Feb 23:30 UTC
 *                          (1 Mar Paris)                            → 40 left
 * D  store credit 12 from a Refund at Lons (10 Feb), paid 5 at Orgelet
 *                          (15 Feb)                                 →  7 left
 * F  sold 20 through a Sale at Orgelet (7 Feb)                      → 20 left
 * X  by hand 100 (5 Jan), cancelled 14 Feb                          →  0
 * E  by hand 10 (1 Dec 2023), paid 10 at Orgelet (2 Dec), expires 25 Feb
 *                          with nothing left                        →  0
 *
 * January: A, B, X issued by hand (190), B paid 15; 175 left on A, B, X.
 * February 2023 (last year): nothing.
 */
beforeAll(async () => {
  category = await createCategory({ name: "Vaisselle" });
  orgelet = await createStore("Orgelet");
  lons = await createStore("Lons");

  const cardE = await cardByHand(orgelet, { at: "2023-12-01T10:00:00Z", value: 10 });
  await payWith(cardE, orgelet, { at: "2023-12-02T10:00:00Z", amount: 10 });
  await expireOn(cardE, "2024-02-25T10:00:00Z");

  const cardX = await cardByHand(orgelet, { at: "2024-01-05T10:00:00Z", value: 100 });
  const cardA = await cardByHand(orgelet, { at: "2024-01-10T10:00:00Z", value: 50 });
  const cardB = await cardByHand(lons, { at: "2024-01-15T10:00:00Z", value: 40 });
  await payWith(cardB, lons, { at: "2024-01-20T10:00:00Z", amount: 15 });
  await expireOn(cardB, "2024-02-20T10:00:00Z");

  const cardC = await cardByHand(lons, { at: "2024-01-31T23:30:00Z", value: 30 });
  await payWith(cardA, orgelet, { at: "2024-02-05T10:00:00Z", amount: 20 });
  await soldCard(orgelet, { at: "2024-02-07T10:00:00Z", value: 20 });
  await topUp(cardC, lons, { at: "2024-02-08T10:00:00Z", amount: 10 });

  const lonsSale = await saleOf(lons, { at: "2024-02-01T10:00:00Z", price: 12 });
  const cardD = await storeCreditCard(lons, { at: "2024-02-10T10:00:00Z", sold: lonsSale });
  const orgeletSale = await saleOf(orgelet, { at: "2024-02-02T10:00:00Z", price: 6 });
  await refundOnto(cardA, orgelet, { at: "2024-02-12T10:00:00Z", sold: orgeletSale });
  await cancelOn(cardX, "2024-02-14T09:00:00Z");
  await payWith(cardD, orgelet, { at: "2024-02-15T10:00:00Z", amount: 5 });
  await payWith(cardC, lons, { at: "2024-02-29T23:30:00Z", amount: 10 });
}, 30_000);

describe("GET /gift-cards/analytics", () => {
  it("counts the cards created by hand in the Paris-time range at their initial value", async () => {
    const res = await getGiftCards(FEB_2024);

    expect(res.status).toBe(200);
    expect(res.body.data.current.issued.by_hand).toEqual({ count: 1, amount: 30 });
  });

  it("counts store credit from Refunds: a card issued by a Refund and a Refund credited onto a card", async () => {
    const res = await getGiftCards(FEB_2024);

    expect(res.body.data.current.issued.store_credit).toEqual({ count: 2, amount: 18 });
  });

  it("puts cards sold through a Sale and top-ups (credits on a sell, not a Refund) on their own lines", async () => {
    const res = await getGiftCards(FEB_2024);

    expect(res.body.data.current.issued.sold).toEqual({ count: 1, amount: 20 });
    expect(res.body.data.current.issued.top_up).toEqual({ count: 1, amount: 10 });
  });

  it("counts the uses in the Paris-time range as a positive amount, partial uses included", async () => {
    const res = await getGiftCards(FEB_2024);

    // A paid 20 and D paid 5; C paid on 1 Mar in Paris (29 Feb 23:30 UTC).
    expect(res.body.data.current.used).toEqual({ count: 2, amount: 25 });
  });

  it("counts the cards whose expiry falls in the range, with the balance left on them then", async () => {
    const res = await getGiftCards(FEB_2024);

    // B expires with 25 left; E expires spent, so nothing is lost.
    expect(res.body.data.current.expired).toEqual({ count: 1, amount: 25 });
  });

  it("sums the balances left at the end of date_to in Paris, without expired or cancelled cards", async () => {
    const res = await getGiftCards(FEB_2024);

    // A 36 + C 40 (its 1 Mar use not yet made) + D 7 + F 20.
    expect(res.body.data.current.outstanding).toEqual({ count: 4, amount: 103 });
  });
});

describe("GET /gift-cards/analytics Store scope", () => {
  it("filters store credit by its Refund's Store and uses by the paying Sale's Store; the rest is network-wide", async () => {
    const [orgeletRes, lonsRes] = await Promise.all([
      getGiftCards({ ...FEB_2024, store_id: orgelet.store.id }),
      getGiftCards({ ...FEB_2024, store_id: lons.store.id }),
    ]);

    const networkWide = {
      expired: { count: 1, amount: 25 },
      outstanding: { count: 4, amount: 103 },
    };
    expect(orgeletRes.body.data.current).toEqual({
      issued: {
        by_hand: { count: 1, amount: 30 },
        sold: { count: 1, amount: 20 },
        store_credit: { count: 1, amount: 6 },
        top_up: { count: 0, amount: 0 },
      },
      // D, credited at Lons, was spent at Orgelet.
      used: { count: 2, amount: 25 },
      ...networkWide,
    });
    expect(lonsRes.body.data.current).toEqual({
      issued: {
        by_hand: { count: 1, amount: 30 },
        sold: { count: 0, amount: 0 },
        store_credit: { count: 1, amount: 12 },
        top_up: { count: 1, amount: 10 },
      },
      used: { count: 0, amount: 0 },
      ...networkWide,
    });
  });
});

describe("GET /gift-cards/analytics comparison", () => {
  it("compares with the same days last year by default", async () => {
    const res = await getGiftCards(FEB_2024);

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2023-02-01",
      date_to: "2023-02-28",
    });
    expect(res.body.data.comparison.issued.by_hand).toEqual({ count: 0, amount: 0 });
    expect(res.body.data.comparison.outstanding).toEqual({ count: 0, amount: 0 });
  });

  it("keeps a card cancelled later in the balance of the month before", async () => {
    const res = await getGiftCards({ ...FEB_2024, compare: "previous" });

    expect(res.body.data.ranges.comparison).toEqual({
      date_from: "2024-01-01",
      date_to: "2024-01-31",
    });
    expect(res.body.data.comparison).toEqual({
      issued: {
        // C was created on 1 Feb in Paris (31 Jan 23:30 UTC).
        by_hand: { count: 3, amount: 190 },
        sold: { count: 0, amount: 0 },
        store_credit: { count: 0, amount: 0 },
        top_up: { count: 0, amount: 0 },
      },
      used: { count: 1, amount: 15 },
      expired: { count: 0, amount: 0 },
      // A 50, B 25 and X 100, cancelled on 14 Feb; E is spent.
      outstanding: { count: 3, amount: 175 },
    });
  });
});

describe("GET /gift-cards/analytics route", () => {
  it("is declared before any /:id route of the gift-cards router", () => {
    const paths = router.stack.map((layer) => layer.route?.path);

    const analytics = paths.indexOf("/analytics");
    expect(analytics).toBeGreaterThan(-1);
    expect(paths.slice(0, analytics).some((path) => path?.includes(":id"))).toBe(false);
  });

  it("refuses date_from after date_to with a 400", async () => {
    const res = await getGiftCards({ date_from: "2024-03-01", date_to: "2024-02-01" });

    expect(res.status).toBe(400);
  });
});
