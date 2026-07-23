import { beforeAll, describe, expect, it } from "@jest/globals";
import { getCartLinePrice } from "@recyclerie/api/domain/cart";
import db from "../../src/models/index";
import {
  getGiftCardBalance,
  issueGiftCard,
} from "../../src/services/giftCards";
import {
  createRefund,
  createTransaction,
  removeTransaction,
  transactionsStats,
  updateTransaction,
} from "../../src/v1/controllers/salesTransactions";
import {
  createCashRegister,
  createOpenSession,
  createRecyclery,
  createUser,
  makeSaleBody,
} from "../models/helpers.js";
import { expectHttpError, makeReq, makeRes } from "./helpers.js";

const {
  CashRegister,
  CashSession,
  Category,
  GiftCardTransaction,
  LabeledItem,
  SalesTransaction,
  TransactionPayment,
} = db;

describe("salesTransactions review regressions", () => {
  /** @type {import("../../src/models/user.js").default} */
  let owner;
  /** @type {import("../../src/models/user.js").default} */
  let other;
  let ownerId;
  let otherUserId;
  let sessionId;
  let otherSessionId;
  let categoryId;
  let recycleryId;
  let registerId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    owner = await createUser({ role: "admin" });
    other = await createUser({ role: "employee" });
    ownerId = owner.id;
    otherUserId = other.id;

    const recyclery = await createRecyclery();
    recycleryId = recyclery.id;
    const register = await createCashRegister(recyclery.id);
    registerId = register.id;

    const session = await createOpenSession({
      registerId: register.id,
      userId: owner.id,
    });
    sessionId = session.id;

    const otherSession = await createOpenSession({
      registerId: register.id,
      userId: other.id,
    });
    otherSessionId = otherSession.id;

    const category = await Category.create({ name: "ReviewCat", IO: 0 });
    categoryId = category.id;
  });

  const makeLabeledItem = async (price, overrides = {}) =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: ownerId,
      price,
      weight: 0,
      status: "available",
      ...overrides,
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

  const createSale = async ({
    item,
    quantity = 1,
    userId = ownerId,
    cashSessionId = sessionId,
    payments,
    bundleQuantity = null,
    bundlePrice = null,
    promotion = 0,
    global_promotion,
    global_promotion_type,
  }) => {
    const line = makeItemPayload(item, {
      quantity,
      bundleQuantity,
      bundlePrice,
      promotion,
    });
    const lineTotal = getCartLinePrice(line);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId: cashSessionId,
          items: [line],
          total_amount_before_promotion: lineTotal,
          total_amount: lineTotal,
          payments,
          global_promotion,
          global_promotion_type,
        }),
      }),
      res,
    );
    return {
      saleId: res.json.mock.calls[0][0].data.id,
      transaction: res.json.mock.calls[0][0].data.transaction,
      line,
      lineTotal,
    };
  };

  describe("removeTransaction authorization", () => {
    it("forbids deleting another user's open-session sale", async () => {
      expect.hasAssertions();
      const item = await makeLabeledItem(10);
      const { saleId } = await createSale({ item });

      await expectHttpError(
        () =>
          removeTransaction(
            makeReq({
              params: { id: saleId },
              user: other,
            }),
            makeRes(),
          ),
        403,
      );

      const stillThere = await SalesTransaction.findByPk(saleId);
      expect(stillThere).not.toBeNull();
    });

    it("forbids deleting a sale after the cash session is closed", async () => {
      expect.hasAssertions();
      const openThenClose = await CashSession.create({
        cash_register_id: registerId,
        user_id: ownerId,
        opening_amount: 0,
        status: "open",
      });
      const { saleId } = await createSale({
        item: await makeLabeledItem(11.5),
        cashSessionId: openThenClose.id,
      });
      await openThenClose.update({ status: "close" });

      await expectHttpError(
        () =>
          removeTransaction(
            makeReq({
              params: { id: saleId },
              user: owner,
            }),
            makeRes(),
          ),
        403,
      );
    });

    it("forbids deleting a sale that already has refunds", async () => {
      expect.hasAssertions();
      const item = await makeLabeledItem(20);
      const { saleId } = await createSale({ item, quantity: 2 });

      const refundRes = makeRes();
      await createRefund(
        makeReq({
          params: { id: saleId },
          user: owner,
          body: {
            cash_session_id: sessionId,
            total_amount: 20,
            payment_method: "cash",
            refund_reason: "partial",
            items: [makeItemPayload(item, { quantity: 1 })],
          },
        }),
        refundRes,
      );
      expect(refundRes.status).toHaveBeenCalledWith(201);

      await expectHttpError(
        () =>
          removeTransaction(
            makeReq({
              params: { id: saleId },
              user: owner,
            }),
            makeRes(),
          ),
        403,
      );
    });

    it("allows the session owner to delete an open-session sale", async () => {
      const item = await makeLabeledItem(9);
      const { saleId } = await createSale({ item });

      const res = makeRes();
      await removeTransaction(
        makeReq({
          params: { id: saleId },
          user: owner,
        }),
        res,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Transaction supprimée",
        }),
      );
      expect(await SalesTransaction.findByPk(saleId)).toBeNull();
    });
  });

  describe("createRefund quantity / bundle money", () => {
    // Known bug: quantity < alreadyRefunded yields a negative refund instead of 400
    it(
      "rejects cumulative refund quantity below already refunded",
      async () => {
        expect.hasAssertions();
        const item = await makeLabeledItem(15);
        const { saleId } = await createSale({ item, quantity: 4 });

        const first = makeRes();
        await createRefund(
          makeReq({
            params: { id: saleId },
            user: owner,
            body: {
              cash_session_id: sessionId,
              total_amount: 30,
              payment_method: "cash",
              refund_reason: "first",
              items: [makeItemPayload(item, { quantity: 2 })],
            },
          }),
          first,
        );
        expect(first.status).toHaveBeenCalledWith(201);

        await expectHttpError(
          () =>
            createRefund(
              makeReq({
                params: { id: saleId },
                user: owner,
                body: {
                  cash_session_id: sessionId,
                  total_amount: 15,
                  payment_method: "cash",
                  refund_reason: "below already refunded",
                  items: [makeItemPayload(item, { quantity: 1 })],
                },
              }),
              makeRes(),
            ),
          400,
        );
      },
    );

    it(
      "refunds partial bundle quantity using cart line delta, not average unit price",
      async () => {
        const item = await makeLabeledItem(10);
        const soldQty = 5;
        const refundCumulativeQty = 2;
        const line = {
          price: 10,
          quantity: soldQty,
          promotion: 0,
          bundleQuantity: 2,
          bundlePrice: 15,
        };
        const remainingLine = {
          ...line,
          quantity: soldQty - refundCumulativeQty,
        };
        const expectedRefund =
          getCartLinePrice(line) - getCartLinePrice(remainingLine);
        // average-unit formula (current bug) would be (40/5)*2 = 16, not 15
        expect(expectedRefund).toBe(15);
        expect((getCartLinePrice(line) / soldQty) * refundCumulativeQty).toBe(
          16,
        );

        const { saleId } = await createSale({
          item,
          quantity: soldQty,
          bundleQuantity: 2,
          bundlePrice: 15,
        });

        const sale = await SalesTransaction.findByPk(saleId, {
          include: [{ model: LabeledItem, as: "items" }],
        });
        const saleLine = sale.items[0].TransactionItem;
        expect(Number(saleLine.quantity)).toBe(soldQty);
        expect(Number(saleLine.total_price)).toBe(40);

        const refundRes = makeRes();
        await createRefund(
          makeReq({
            params: { id: saleId },
            user: owner,
            body: {
              cash_session_id: sessionId,
              total_amount: expectedRefund,
              payment_method: "cash",
              refund_reason: "partial bundle",
              items: [
                makeItemPayload(item, {
                  quantity: refundCumulativeQty,
                  bundleQuantity: 2,
                  bundlePrice: 15,
                }),
              ],
            },
          }),
          refundRes,
        );

        expect(refundRes.status).toHaveBeenCalledWith(201);
        const refundDto = refundRes.json.mock.calls[0][0].data.refund;
        expect(Number(refundDto.total_amount)).toBeCloseTo(expectedRefund, 2);
      },
    );

    it("refunds a bundle sale in steps including qty 3, then finishes", async () => {
      const item = await makeLabeledItem(10);
      const soldQty = 5;
      const line = {
        price: 10,
        quantity: soldQty,
        promotion: 0,
        bundleQuantity: 2,
        bundlePrice: 15,
      };
      // remaining: qty 5 → 40, 3 → 25, 2 → 15, 1 → 10, 0 → 0
      const expectedAt2 =
        getCartLinePrice(line) - getCartLinePrice({ ...line, quantity: 3 });
      const expectedAt3 =
        getCartLinePrice({ ...line, quantity: 3 }) -
        getCartLinePrice({ ...line, quantity: 2 });
      const expectedAt4 =
        getCartLinePrice({ ...line, quantity: 2 }) -
        getCartLinePrice({ ...line, quantity: 1 });
      const expectedAt5 = getCartLinePrice({ ...line, quantity: 1 });
      expect(expectedAt2).toBe(15);
      expect(expectedAt3).toBe(10);
      expect(expectedAt4).toBe(5);
      expect(expectedAt5).toBe(10);
      expect(expectedAt2 + expectedAt3 + expectedAt4 + expectedAt5).toBe(
        getCartLinePrice(line),
      );

      const { saleId } = await createSale({
        item,
        quantity: soldQty,
        bundleQuantity: 2,
        bundlePrice: 15,
      });

      const refundStep = async (cumulativeQty, expectedAmount, reason) => {
        const res = makeRes();
        await createRefund(
          makeReq({
            params: { id: saleId },
            user: owner,
            body: {
              cash_session_id: sessionId,
              total_amount: expectedAmount,
              payment_method: "cash",
              refund_reason: reason,
              items: [
                makeItemPayload(item, {
                  quantity: cumulativeQty,
                  bundleQuantity: 2,
                  bundlePrice: 15,
                }),
              ],
            },
          }),
          res,
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(
          Number(res.json.mock.calls[0][0].data.refund.total_amount),
        ).toBeCloseTo(expectedAmount, 2);
        return res;
      };

      await refundStep(2, expectedAt2, "partial to qty 2");
      await refundStep(3, expectedAt3, "partial to qty 3");
      await refundStep(4, expectedAt4, "partial to qty 4");
      await refundStep(5, expectedAt5, "finish bundle refund");

      const parent = await SalesTransaction.findByPk(saleId, {
        include: [{ model: SalesTransaction, as: "refunds" }],
      });
      expect(parent.refunds).toHaveLength(4);
      const refundedTotal = parent.refunds.reduce(
        (sum, r) => sum + Number(r.total_amount),
        0,
      );
      expect(refundedTotal).toBeCloseTo(getCartLinePrice(line), 2);

      await expectHttpError(
        () =>
          createRefund(
            makeReq({
              params: { id: saleId },
              user: owner,
              body: {
                cash_session_id: sessionId,
                total_amount: 10,
                payment_method: "cash",
                refund_reason: "over-refund",
                items: [
                  makeItemPayload(item, {
                    quantity: 6,
                    bundleQuantity: 2,
                    bundlePrice: 15,
                  }),
                ],
              },
            }),
            makeRes(),
          ),
        400,
      );
    });
  });

  describe("updateTransaction gift card payments", () => {
    const issueCardOnSeedSale = async (initialValue) => {
      const seedItem = await makeLabeledItem(1);
      const { saleId: seedSaleId } = await createSale({ item: seedItem });
      return issueGiftCard({
        initialValue,
        createdBy: ownerId,
        issuedTransactionId: seedSaleId,
      });
    };

    it("sets gift_card_id when switching a cash sale to giftcard payment", async () => {
      const item = await makeLabeledItem(25);
      const { saleId, line, lineTotal } = await createSale({ item });
      const card = await issueCardOnSeedSale(100);

      await updateTransaction(
        makeReq({
          params: { id: saleId },
          user: owner,
          body: makeSaleBody({
            sessionId,
            items: [line],
            total_amount_before_promotion: lineTotal,
            total_amount: lineTotal,
            payments: [
              {
                method: "giftcard",
                amount: lineTotal,
                gift_card_code: card.code,
              },
            ],
          }),
        }),
        makeRes(),
      );

      const payments = await TransactionPayment.findAll({
        where: { sales_transaction_id: saleId },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].method).toBe("giftcard");
      expect(payments[0].gift_card_id).toBe(card.id);

      const balance = await getGiftCardBalance(card.id);
      expect(balance.currentBalance).toBe(100 - lineTotal);
    });

    it("restores gift card balance when giftcard payment is removed on update", async () => {
      const item = await makeLabeledItem(18);
      const { saleId, line, lineTotal } = await createSale({ item });
      const card = await issueCardOnSeedSale(50);

      await updateTransaction(
        makeReq({
          params: { id: saleId },
          user: owner,
          body: makeSaleBody({
            sessionId,
            items: [line],
            total_amount_before_promotion: lineTotal,
            total_amount: lineTotal,
            payments: [
              {
                method: "giftcard",
                amount: lineTotal,
                gift_card_code: card.code,
              },
            ],
          }),
        }),
        makeRes(),
      );

      const afterCharge = await getGiftCardBalance(card.id);
      expect(afterCharge.currentBalance).toBe(50 - lineTotal);

      await updateTransaction(
        makeReq({
          params: { id: saleId },
          user: owner,
          body: makeSaleBody({
            sessionId,
            items: [line],
            total_amount_before_promotion: lineTotal,
            total_amount: lineTotal,
            payments: [{ method: "cash", amount: lineTotal }],
          }),
        }),
        makeRes(),
      );

      const afterRemove = await getGiftCardBalance(card.id);
      expect(afterRemove.currentBalance).toBe(50);

      const movements = await GiftCardTransaction.findAll({
        where: { sales_transaction_id: saleId },
      });
      expect(movements).toHaveLength(0);

      const payments = await TransactionPayment.findAll({
        where: { sales_transaction_id: saleId },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].method).toBe("cash");
      expect(payments[0].gift_card_id).toBeNull();
    });

    it("forbids update from a different session user", async () => {
      expect.hasAssertions();
      const item = await makeLabeledItem(8);
      const { saleId, line, lineTotal } = await createSale({ item });

      await expectHttpError(
        () =>
          updateTransaction(
            makeReq({
              params: { id: saleId },
              user: other,
              body: makeSaleBody({
                sessionId: otherSessionId,
                items: [line],
                total_amount_before_promotion: lineTotal,
                total_amount: lineTotal,
              }),
            }),
            makeRes(),
          ),
        404,
      );
    });
  });

  describe("transactionsStats sell vs refund", () => {
    // Known bug: total_refunded is hard-coded to 0; refunds are mixed into sales sums
    it.failing(
      "does not count refund rows as sales and reports refunded total",
      async () => {
        const register = await CashRegister.create({
          name: `StatsReg_${Date.now()}`,
          recyclery_id: recycleryId,
          is_active: true,
        });
        const statsSession = await createOpenSession({
          registerId: register.id,
          userId: ownerId,
        });

        const item = await makeLabeledItem(40);
        const { saleId, lineTotal } = await createSale({
          item,
          quantity: 2,
          cashSessionId: statsSession.id,
        });

        const refundRes = makeRes();
        await createRefund(
          makeReq({
            params: { id: saleId },
            user: owner,
            body: {
              cash_session_id: statsSession.id,
              total_amount: 40,
              payment_method: "cash",
              refund_reason: "stats",
              items: [makeItemPayload(item, { quantity: 1 })],
            },
          }),
          refundRes,
        );
        expect(refundRes.status).toHaveBeenCalledWith(201);
        const refundAmount = Number(
          refundRes.json.mock.calls[0][0].data.refund.total_amount,
        );

        const statsRes = makeRes();
        await transactionsStats(
          makeReq({
            query: { store_id: String(recycleryId) },
            user: owner,
          }),
          statsRes,
        );

        const stats = statsRes.json.mock.calls[0][0].data;
        const sellSum = await SalesTransaction.sum("total_amount", {
          where: {
            transactionType: "sell",
            cash_session_id: statsSession.id,
          },
        });
        const refundSum = await SalesTransaction.sum("total_amount", {
          where: {
            transactionType: "refund",
            cash_session_id: statsSession.id,
          },
        });
        expect(Number(sellSum)).toBe(lineTotal);
        expect(Number(refundSum)).toBe(refundAmount);

        // Stats should expose refunds separately, not as 0
        expect(Number(stats.total_refunded)).toBeGreaterThanOrEqual(
          refundAmount,
        );
        // And should not treat refund rows as positive sales contribution
        expect(Number(stats.total_sales_before_refunds)).toBe(Number(sellSum));
      },
    );
  });
});
