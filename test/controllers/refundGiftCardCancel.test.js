import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  chargeGiftCard,
  getGiftCardBalance,
  issueGiftCard,
} from "../../src/services/giftCards";
import {
  createRefund,
  createTransaction,
  removeTransaction,
} from "../../src/v1/controllers/salesTransactions";
import {
  createCashRegister,
  createOpenSession,
  createRecyclery,
  createUser,
  makeSaleBody,
} from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const {
  Category,
  GiftCard,
  GiftCardTransaction,
  LabeledItem,
  SalesTransaction,
  TransactionPayment,
} = db;

describe("cancelling a Refund paid out on a gift card", () => {
  /** @type {import("../../src/models/user.js").default} */
  let user;
  let sessionId;
  let categoryId;
  let recycleryId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    user = await createUser({ role: "admin" });
    const recyclery = await createRecyclery();
    recycleryId = recyclery.id;
    const register = await createCashRegister(recyclery.id);
    const session = await createOpenSession({
      registerId: register.id,
      userId: user.id,
    });
    sessionId = session.id;
    const category = await Category.create({ name: "RefundCardCat", IO: 0 });
    categoryId = category.id;
  });

  const makeItemPayload = (item, overrides = {}) => ({
    name: `item-${item.id}`,
    price: Number(item.price),
    quantity: 1,
    category_id: item.category_id,
    subcategory_id: null,
    weight: Number(item.weight),
    barcode: String(item.barcode ?? item.id),
    promotion: 0,
    bundlePrice: null,
    bundleQuantity: null,
    ...overrides,
  });

  const newItem = (price) =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: user.id,
      price,
      weight: 0,
      status: "available",
    });

  /** Sell one fresh item, optionally paying with given payments. */
  const sell = async (price, payments) => {
    const item = await newItem(price);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user,
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload(item)],
          ...(payments ? { payments } : {}),
        }),
      }),
      res,
    );
    return { item, saleId: res.json.mock.calls[0][0].data.id };
  };

  /** Refund the item of a Sale onto a gift card through the real flow. */
  const refundOnCard = async ({ saleId, item, giftCardCode }) => {
    const res = makeRes();
    await createRefund(
      makeReq({
        params: { id: saleId },
        user,
        body: {
          cash_session_id: sessionId,
          total_amount: Number(item.price),
          payment_method: "giftcard",
          ...(giftCardCode ? { gift_card_code: giftCardCode } : {}),
          refund_reason: "test",
          items: [makeItemPayload(item)],
        },
      }),
      res,
    );
    const data = res.json.mock.calls[0][0].data;
    return { refundId: data.refund.id, giftCard: data.giftCard };
  };

  const cancel = (id) =>
    removeTransaction(makeReq({ params: { id }, user }), makeRes());

  const snapshot = async (refundId, cardId) => ({
    refund: (await SalesTransaction.findByPk(refundId)) != null,
    card: (await GiftCard.findByPk(cardId)) != null,
    movements: await GiftCardTransaction.count({
      where: { gift_card_id: cardId },
    }),
    payments: await TransactionPayment.count({
      where: { gift_card_id: cardId },
    }),
    refundPayments: await TransactionPayment.count({
      where: { sales_transaction_id: refundId },
    }),
    balance: (await getGiftCardBalance(cardId)).currentBalance,
  });

  describe("Refund that issued a new card", () => {
    it("records its own payout line on the issued card", async () => {
      const { saleId, item } = await sell(12);
      const { refundId, giftCard } = await refundOnCard({ saleId, item });
      const payout = await TransactionPayment.findAll({
        where: { sales_transaction_id: refundId },
      });
      expect(payout).toHaveLength(1);
      expect(payout[0].gift_card_id).toBe(giftCard.id);
    });

    it("cancels the Refund and deletes the unused card and its movements", async () => {
      const { saleId, item } = await sell(15);
      const { refundId, giftCard } = await refundOnCard({ saleId, item });

      await cancel(refundId);

      expect(await SalesTransaction.findByPk(refundId)).toBeNull();
      expect(await GiftCard.findByPk(giftCard.id)).toBeNull();
      expect(
        await GiftCardTransaction.count({
          where: { gift_card_id: giftCard.id },
        }),
      ).toBe(0);
      expect(
        await TransactionPayment.count({
          where: { sales_transaction_id: refundId },
        }),
      ).toBe(0);
    });

    it("refuses once the card paid another Sale, and changes nothing", async () => {
      const { saleId, item } = await sell(20);
      const { refundId, giftCard } = await refundOnCard({ saleId, item });
      await sell(5, [
        { method: "giftcard", amount: 5, gift_card_code: giftCard.code },
      ]);
      const before = await snapshot(refundId, giftCard.id);

      await expect(cancel(refundId)).rejects.toMatchObject({
        status: 424,
        message:
          "Impossible de supprimer le remboursement: une carte cadeau émise a déjà été utilisée",
      });

      expect(await snapshot(refundId, giftCard.id)).toEqual(before);
      expect(before.refund).toBe(true);
      expect(before.card).toBe(true);
    });

    it("refuses once the card was charged, and changes nothing", async () => {
      const { saleId, item } = await sell(25);
      const { refundId, giftCard } = await refundOnCard({ saleId, item });
      const { saleId: otherSaleId } = await sell(3);
      await chargeGiftCard({
        giftCardId: giftCard.id,
        salesTransactionId: otherSaleId,
        amount: 3,
        createdBy: user.id,
      });
      const before = await snapshot(refundId, giftCard.id);

      await expect(cancel(refundId)).rejects.toMatchObject({ status: 424 });

      expect(await snapshot(refundId, giftCard.id)).toEqual(before);
    });
  });

  describe("Refund that topped up an existing card", () => {
    const existingCard = (initialValue) =>
      issueGiftCard({ initialValue, createdBy: user.id });

    it("cancels while the credit is unspent and restores the balance", async () => {
      const card = await existingCard(10);
      const { saleId, item } = await sell(8);
      const { refundId } = await refundOnCard({
        saleId,
        item,
        giftCardCode: card.code,
      });
      expect((await getGiftCardBalance(card.id)).currentBalance).toBe(18);

      await cancel(refundId);

      expect(await SalesTransaction.findByPk(refundId)).toBeNull();
      expect(await GiftCard.findByPk(card.id)).not.toBeNull();
      expect((await getGiftCardBalance(card.id)).currentBalance).toBe(10);
    });

    it("refuses once the credit is spent", async () => {
      const card = await existingCard(10);
      const { saleId, item } = await sell(8);
      const { refundId } = await refundOnCard({
        saleId,
        item,
        giftCardCode: card.code,
      });
      await sell(15, [
        { method: "giftcard", amount: 15, gift_card_code: card.code },
      ]);
      const before = await snapshot(refundId, card.id);

      await expect(cancel(refundId)).rejects.toMatchObject({ status: 424 });

      expect(await snapshot(refundId, card.id)).toEqual(before);
      expect(before.balance).toBe(3);
    });
  });

  describe("Sale that sold a gift card", () => {
    it("keeps the used-card refusal worded for a Sale", async () => {
      const { saleId } = await sell(30);
      const card = await issueGiftCard({
        initialValue: 30,
        issuedTransactionId: saleId,
        createdBy: user.id,
      });
      await sell(4, [
        { method: "giftcard", amount: 4, gift_card_code: card.code },
      ]);

      await expect(cancel(saleId)).rejects.toMatchObject({
        status: 424,
        message:
          "Impossible de supprimer la vente: une carte cadeau émise a déjà été utilisée",
      });
      expect(await GiftCard.findByPk(card.id)).not.toBeNull();
    });
  });
});
