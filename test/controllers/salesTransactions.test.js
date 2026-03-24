// import { beforeAll, afterAll, expect, jest } from "@jest/globals";
// import db from "../../src/models/index.js";
// import { createRefund, createTransaction, listRefunds, listTransactions } from "../../src/v1/controllers/salesTransactions.js";
// const { Recyclery, CashRegister, User, CashSession } = db

// beforeAll(async () => {
//     await db.sequelize.sync({ force: true });
//     await User.create({
//         email: "cashier@test.com",
//         username: "cashier1",
//         role: "employee"
//     })
//     await Recyclery.create({
//         name: "Recyclerie Test Orgelet",
//         address: "123 Rue de la Recyclerie",
//         phone: "+33 1 23 45 67 89",
//         email: "recyclery.orgelet@test.com",
//         city: "Orgelet",
//         postal_code: "39270"
//     })

//     await CashRegister.create({
//         name: "Caisse Principale",
//         recyclery_id: 1,
//         is_active: true
//     })
//     await CashSession.create({
//         cash_register_id: 1,
//         user_id: 1,
//         opening_amount: 500.00,
//         recyclery_id: 1,
//         status: "open"
//     })

// })

// afterAll(async () => {
//   // Global teardown handles database cleanup
// })

// describe("transactions controller functions", () => {

//     it("should create a transaction", async () => {
//         const body = {
//             cash_session_id: 1,
//             store_id: 1,
//             total_amount: 45.50,
//             payment_method: "cash",
//             payment_amount: 50.00,
//             change_amount: 4.50,
//             items: [
//                 {
//                     item_id: 1,
//                     quantity: 1,
//                     unit_price: 25.00,
//                     total_price: 25.00
//                 },
//                 {
//                     item_id: 2,
//                     quantity: 2,
//                     unit_price: 10.25,
//                     total_price: 20.50
//                 }
//             ],
//         };
//         const req = {
//             query: {},
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await createTransaction(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 data: expect.any(Object),
//                 success: true,
//                 // message: "Transaction créée avec succès",
//             })
//         );
//     });

//     it("should list transaction for store 1", async () => {
//         const body = {
//             store_id: 1,

//             limit: 50,
//             offset: 0,
//         };
//         const req = {
//             query: {},
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await listTransactions(req, res);

//         expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
//             success: true,
//             transactions: expect.any(Array),

//         }))

//     });

//     it("should create a refund", async () => {
//         const body = {
//             cash_register_id: 1,
//             transaction_id: 1,
//             refund_type: 'full',
//             refund_amount: 45.50,
//             refund_reason: "Article défectueux - retour client"
//         };
//         const req = {
//             params: { store_id: 1 },
//             query: { store_id: 1 },
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await createRefund(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 refund: expect.any(Object),
//                 success: true
//             })
//         );
//     });

//     it("should list refund for transaction", async () => {
//         const req = {
//             params: { id: 1 },
//             query: { store_id: 1 },
//             user: { id: 1, role: "admin" },
//             body: { closing_amount: 500 }
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await listRefunds(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 success: true,
//                 refunds: expect.any(Array),
//             })
//         );
//     });

// });

import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  createRefund,
  createTransaction,
} from "../../src/v1/controllers/salesTransactions.js";
import { closeCashSession } from "../../src/v1/controllers/cashSession.js";
import { getGiftCardBalance, issueGiftCard } from "../../src/services/giftCards.js";
import { createRecyclery, createUser } from "../models/helpers.js";

const {
  CashRegister,
  CashSession,
  Category,
  GiftCard,
  LabeledItem,
  SalesTransaction,
  TransactionPayment,
} = db;

const makeRes = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

const makeItemPayload = ({ item, quantity = 1, promotion = 0, bundleQuantity = null, bundlePrice = null }) => ({
  name: `item-${item.id}`,
  price: Number(item.price),
  quantity,
  category_id: item.category_id,
  subcategory_id: null,
  weight: Number(item.weight),
  barcode: String(item.barcode),
  promotion,
  bundlePrice,
  bundleQuantity,
});

describe("salesTransactions controller gift card/refund flows", () => {
  /** @type {number} */
  let userId;
  /** @type {number} */
  let sessionId;
  /** @type {number} */
  let categoryId;
  /** @type {number} */
  let giftCardId;
  /** @type {string} */
  let giftCardCode;
  /** @type {number} */
  let baseSaleId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    const user = await createUser({ role: "admin" });
    userId = user.id;

    const recyclery = await createRecyclery();
    const register = await CashRegister.create({
      name: "Main register",
      recyclery_id: recyclery.id,
      is_active: true,
    });

    const session = await CashSession.create({
      cash_register_id: register.id,
      user_id: user.id,
      opening_amount: 100,
      notes: "Gift card scenario",
    });
    sessionId = session.id;

    const category = await Category.create({
      name: "General",
      IO: 0,
    });
    categoryId = category.id;
  });

  it("refunds a sale twice to the same gift card and keeps exact balance", async () => {
    const itemA = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 10,
      weight: 0,
      status: "available",
    });
    const itemB = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 20,
      weight: 0,
      status: "available",
    });

    const saleReq = {
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: 30,
        payment_amount: 30,
        payments: [{ method: "cash", amount: 30 }],
        items: [
          makeItemPayload({ item: itemA }),
          makeItemPayload({ item: itemB }),
        ],
      },
    };
    const saleRes = makeRes();
    await createTransaction(saleReq, saleRes);
    const saleData = saleRes.json.mock.calls[0][0].data;
    baseSaleId = saleData.id;
    expect(saleRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );

    giftCardCode = `GC-FLOW-${Date.now()}`;
    const card = await issueGiftCard({
      code: giftCardCode,
      initialValue: 30,
      issuedTransactionId: baseSaleId,
      createdBy: userId,
    });
    giftCardId = card.id;

    let balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(60);

    const refundReq1 = {
      params: { id: baseSaleId },
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: 10,
        payment_method: "giftcard",
        gift_card_code: giftCardCode,
        refund_reason: "first refund",
        items: [makeItemPayload({ item: itemA })],
      },
    };
    const refundRes1 = makeRes();
    await createRefund(refundReq1, refundRes1);
    expect(refundRes1.status).toHaveBeenCalledWith(201);
    expect(refundRes1.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        giftCard: expect.objectContaining({ code: giftCardCode }),
      }),
    );

    balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(70);

    const refundReq2 = {
      params: { id: baseSaleId },
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: 20,
        payment_method: "giftcard",
        gift_card_code: giftCardCode,
        refund_reason: "second refund",
        items: [makeItemPayload({ item: itemB })],
      },
    };
    const refundRes2 = makeRes();
    await createRefund(refundReq2, refundRes2);
    expect(refundRes2.status).toHaveBeenCalledWith(201);
    balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(90);
  });

  it("creates a mixed sale with partial gift card payment and updates status/amount", async () => {
    const mixedItem = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 25,
      weight: 0,
      status: "available",
    });

    const req = {
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: 25,
        payment_amount: 25,
        payments: [
          { method: "giftcard", amount: 15, gift_card_code: giftCardCode },
          { method: "cash", amount: 10 },
        ],
        items: [makeItemPayload({ item: mixedItem })],
      },
    };
    const res = makeRes();
    await createTransaction(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBeDefined();

    const createdPayments = await TransactionPayment.findAll({
      where: { sales_transaction_id: payload.data.id },
      order: [["id", "ASC"]],
    });
    expect(createdPayments).toHaveLength(2);
    expect(createdPayments.map((p) => p.method)).toEqual(["giftcard", "cash"]);
    expect(Number(createdPayments[0].amount)).toBe(15);
    expect(Number(createdPayments[1].amount)).toBe(10);

    const balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(75);

    const card = await GiftCard.findByPk(giftCardId);
    expect(card.status).toBe("partially_used");
  });

  it("creates a second mixed sale that consumes remaining gift card value", async () => {
    const fullUseItem = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 80,
      weight: 0,
      status: "available",
    });

    const req = {
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: 80,
        payment_amount: 80,
        payments: [
          { method: "giftcard", amount: 75, gift_card_code: giftCardCode },
          { method: "card", amount: 5 },
        ],
        items: [makeItemPayload({ item: fullUseItem })],
      },
    };
    const res = makeRes();
    await createTransaction(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: expect.any(Number) }),
      }),
    );

    const saleId = res.json.mock.calls[0][0].data.id;
    const payments = await TransactionPayment.findAll({
      where: { sales_transaction_id: saleId },
      order: [["id", "ASC"]],
    });
    expect(payments.map((p) => p.method)).toEqual(["giftcard", "card"]);
    expect(Number(payments[0].amount)).toBe(75);
    expect(Number(payments[1].amount)).toBe(5);

    const balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(0);
    const card = await GiftCard.findByPk(giftCardId);
    expect(card.status).toBe("redeemed");

    const tx = await SalesTransaction.findByPk(saleId);
    expect(tx).not.toBeNull();
    expect(Number(tx.total_amount)).toBe(80);
    expect(tx.payment_method).toBe("mixed");
  });

  it("handles promotion and bundle pricing refunds to gift card with exact values", async () => {
    const promoItem = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 50,
      weight: 0,
      status: "available",
    });
    const bundleItem = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: 1,
      created_by: userId,
      price: 10,
      weight: 0,
      status: "available",
    });

    const promoExpected = 50 * 2 * (1 - 0.2); // 80
    const bundleExpected = (10 * 1 + 15 * 2) * (1 - 0); // 40 for qty 5, bundle 2-for-15

    const promoSaleReq = {
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: promoExpected,
        payment_amount: promoExpected,
        payments: [{ method: "card", amount: promoExpected }],
        items: [
          makeItemPayload({
            item: promoItem,
            quantity: 2,
            promotion: 20,
          }),
        ],
      },
    };
    const promoSaleRes = makeRes();
    await createTransaction(promoSaleReq, promoSaleRes);
    const promoSaleId = promoSaleRes.json.mock.calls[0][0].data.id;

    const promoRefundReq = {
      params: { id: promoSaleId },
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: promoExpected,
        payment_method: "giftcard",
        gift_card_code: giftCardCode,
        refund_reason: "promo refund",
        items: [
          makeItemPayload({
            item: promoItem,
            quantity: 2,
            promotion: 20,
          }),
        ],
      },
    };
    const balanceBeforePromoRefund = await getGiftCardBalance(giftCardId);
    const promoRefundRes = makeRes();
    await createRefund(promoRefundReq, promoRefundRes);
    const balanceAfterPromoRefund = await getGiftCardBalance(giftCardId);
    expect(
      balanceAfterPromoRefund.currentBalance - balanceBeforePromoRefund.currentBalance,
    ).toBe(promoExpected);

    const bundleSaleReq = {
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: bundleExpected,
        payment_amount: bundleExpected,
        payments: [{ method: "cash", amount: bundleExpected }],
        items: [
          makeItemPayload({
            item: bundleItem,
            quantity: 5,
            promotion: 0,
            bundleQuantity: 2,
            bundlePrice: 15,
          }),
        ],
      },
    };
    const bundleSaleRes = makeRes();
    await createTransaction(bundleSaleReq, bundleSaleRes);
    const bundleSaleId = bundleSaleRes.json.mock.calls[0][0].data.id;

    const bundleRefundReq = {
      params: { id: bundleSaleId },
      user: { id: userId, role: "admin" },
      body: {
        cash_session_id: sessionId,
        total_amount: bundleExpected,
        payment_method: "giftcard",
        gift_card_code: giftCardCode,
        refund_reason: "bundle refund",
        items: [
          makeItemPayload({
            item: bundleItem,
            quantity: 5,
            promotion: 0,
            bundleQuantity: 2,
            bundlePrice: 15,
          }),
        ],
      },
    };
    const balanceBeforeBundleRefund = await getGiftCardBalance(giftCardId);
    const bundleRefundRes = makeRes();
    await createRefund(bundleRefundReq, bundleRefundRes);
    const balanceAfterBundleRefund = await getGiftCardBalance(giftCardId);

    expect(
      balanceAfterBundleRefund.currentBalance -
        balanceBeforeBundleRefund.currentBalance,
    ).toBe(bundleExpected);
  });

  it("closes the cash session and validates expected/closing/difference amounts", async () => {
    const totalSales = Number(
      (await SalesTransaction.sum("total_amount", {
        where: { cash_session_id: sessionId },
      })) || 0,
    );
    const openingAmount = 100;
    const expectedAmount = openingAmount + totalSales;
    const closingAmount = expectedAmount + 5;

    const req = {
      params: { id: sessionId },
      user: { id: userId, role: "admin" },
      body: { closing_amount: closingAmount, notes: "closed from test" },
    };
    const res = makeRes();
    await closeCashSession(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Session fermée avec succès",
        expected_amount: expectedAmount,
        difference_amount: 5,
      }),
    );

    const updatedSession = await CashSession.findByPk(sessionId);
    expect(updatedSession.status).toBe("close");
    expect(Number(updatedSession.closing_amount)).toBe(closingAmount);
    expect(Number(updatedSession.expected_amount)).toBe(expectedAmount);
    expect(Number(updatedSession.difference_amount)).toBe(5);
  });
});
