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
import db from "../../src/models/index";
import {
  createRefund,
  createTransaction,
} from "../../src/v1/controllers/salesTransactions";
import { closeCashSession } from "../../src/v1/controllers/cashSession";
import {
  getGiftCardBalance,
  issueGiftCard,
} from "../../src/services/giftCards";
import { createRecyclery, createUser, makeSaleBody } from "../models/helpers.js";
import { makeReq, makeRes, expectHttpError } from "./helpers.js";

const {
  CashRegister,
  CashSession,
  Category,
  GiftCard,
  LabeledItem,
  SalesTransaction,
  TransactionPayment,
} = db;

const makeItemPayload = ({
  item,
  quantity = 1,
  promotion = 0,
  bundleQuantity = null,
  bundlePrice = null,
}) => ({
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

const saleFromRes = (res) => res.json.mock.calls[0][0].data.transaction;

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
      body: makeSaleBody({
        sessionId,
        items: [
          makeItemPayload({ item: itemA }),
          makeItemPayload({ item: itemB }),
        ],
      }),
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
    expect(balance.currentBalance).toBe(30);

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
        data: expect.objectContaining({
          giftCard: expect.objectContaining({ code: giftCardCode }),
        }),
      }),
    );

    balance = await getGiftCardBalance(giftCardId);
    expect(balance.currentBalance).toBe(40);

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
    expect(balance.currentBalance).toBe(60);
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
      body: makeSaleBody({
        sessionId,
        items: [makeItemPayload({ item: mixedItem })],
        payments: [
          { method: "giftcard", amount: 15, gift_card_code: giftCardCode },
          { method: "cash", amount: 10 },
        ],
      }),
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
    expect(balance.currentBalance).toBe(45);

    const card = await GiftCard.findByPk(giftCardId);
    expect(card.status).toBe("active");
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
      body: makeSaleBody({
        sessionId,
        items: [makeItemPayload({ item: fullUseItem })],
        payments: [
          { method: "giftcard", amount: 45, gift_card_code: giftCardCode },
          { method: "card", amount: 35 },
        ],
      }),
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
    expect(Number(payments[0].amount)).toBe(45);
    expect(Number(payments[1].amount)).toBe(35);

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
      body: makeSaleBody({
        sessionId,
        total_amount_before_promotion: promoExpected,
        total_amount: promoExpected,
        items: [
          makeItemPayload({
            item: promoItem,
            quantity: 2,
            promotion: 20,
          }),
        ],
        payments: [{ method: "card", amount: promoExpected }],
      }),
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
      balanceAfterPromoRefund.currentBalance -
        balanceBeforePromoRefund.currentBalance,
    ).toBe(promoExpected);

    const bundleSaleReq = {
      user: { id: userId, role: "admin" },
      body: makeSaleBody({
        sessionId,
        total_amount_before_promotion: bundleExpected,
        total_amount: bundleExpected,
        items: [
          makeItemPayload({
            item: bundleItem,
            quantity: 5,
            promotion: 0,
            bundleQuantity: 2,
            bundlePrice: 15,
          }),
        ],
        payments: [{ method: "cash", amount: bundleExpected }],
      }),
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
    const session = await CashSession.findByPk(sessionId);
    const closingAmount = Number(session.opening_amount) + 10000;

    const req = {
      params: { id: sessionId },
      user: { id: userId, role: "admin" },
      body: { closing_amount: closingAmount, notes: "closed from test" },
    };
    const res = makeRes();
    await closeCashSession(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Session fermée avec succès",
      }),
    );
    expect(payload.difference_amount).toBe(
      closingAmount - payload.expected_amount,
    );

    const updatedSession = await CashSession.findByPk(sessionId);
    expect(updatedSession.status).toBe("close");
    expect(Number(updatedSession.closing_amount)).toBe(closingAmount);
    expect(Number(updatedSession.expected_amount)).toBe(payload.expected_amount);
    expect(Number(updatedSession.difference_amount)).toBe(payload.difference_amount);
  });
});

describe("sale transaction rules", () => {
  let userId;
  let sessionId;
  let categoryId;
  let recycleryId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    const user = await createUser({ role: "admin" });
    userId = user.id;

    const recyclery = await createRecyclery();
    recycleryId = recyclery.id;
    const register = await CashRegister.create({
      name: "Rules register",
      recyclery_id: recyclery.id,
      is_active: true,
    });

    const session = await CashSession.create({
      cash_register_id: register.id,
      user_id: user.id,
      opening_amount: 0,
      status: "open",
    });
    sessionId = session.id;

    const category = await Category.create({ name: "RulesCat", IO: 0 });
    categoryId = category.id;
  });

  const makeLabeledItem = async (price, overrides = {}) =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: userId,
      price,
      weight: 0,
      status: "available",
      ...overrides,
    });

  it("rejects sale outside cash session", async () => {
    const item = await makeLabeledItem(10);
    const res = makeRes();
    await expectHttpError(
      () =>
        createTransaction(
          makeReq({
            user: { id: userId, role: "admin" },
            body: makeSaleBody({
              sessionId: 999,
              items: [makeItemPayload({ item })],
            }),
          }),
          res,
        ),
      404,
    );
  });

  it("rejects sale on closed session", async () => {
    const closedSession = await CashSession.create({
      cash_register_id: (
        await CashRegister.findOne({ where: { recyclery_id: recycleryId } })
      ).id,
      user_id: userId,
      opening_amount: 0,
      status: "close",
    });
    const item = await makeLabeledItem(5);
    const res = makeRes();
    await expectHttpError(
      () =>
        createTransaction(
          makeReq({
            user: { id: userId, role: "admin" },
            body: makeSaleBody({
              sessionId: closedSession.id,
              items: [makeItemPayload({ item })],
            }),
          }),
          res,
        ),
      400,
    );
  });

  it("creates simple sale with one item and cash payment", async () => {
    const item = await makeLabeledItem(12.5);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item })],
        }),
      }),
      res,
    );
    const tx = saleFromRes(res);
    expect(tx.payment_method).toBe("cash");
    expect(Number(tx.total_amount)).toBe(12.5);
  });

  it("creates multi-item sale", async () => {
    const a = await makeLabeledItem(10);
    const b = await makeLabeledItem(15);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item: a }), makeItemPayload({ item: b })],
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(25);
  });

  it("creates sale with quantity greater than 1", async () => {
    const item = await makeLabeledItem(7);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item, quantity: 3 })],
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(21);
  });

  it("creates sale with per-line promotion", async () => {
    const item = await makeLabeledItem(100);
    const lineTotal = 100 * (1 - 20 / 100);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          total_amount_before_promotion: lineTotal,
          total_amount: lineTotal,
          items: [makeItemPayload({ item, promotion: 20 })],
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(lineTotal);
  });

  it("creates sale with bundle pricing", async () => {
    const item = await makeLabeledItem(10);
    const expected = 10 * 1 + 15 * 2;
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          total_amount_before_promotion: expected,
          total_amount: expected,
          items: [
            makeItemPayload({
              item,
              quantity: 5,
              bundleQuantity: 2,
              bundlePrice: 15,
            }),
          ],
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(expected);
  });

  it("creates sale with mixed payments", async () => {
    const item = await makeLabeledItem(30);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item })],
          payments: [
            { method: "cash", amount: 10 },
            { method: "card", amount: 20 },
          ],
        }),
      }),
      res,
    );
    expect(saleFromRes(res).payment_method).toBe("mixed");
  });

  it("creates sale with global percent promotion", async () => {
    const item = await makeLabeledItem(100);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item })],
          global_promotion: 10,
          global_promotion_type: "percent",
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(90);
  });

  it("creates sale with global fixed promotion", async () => {
    const item = await makeLabeledItem(50);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload({ item })],
          global_promotion: 15,
          global_promotion_type: "fixed",
        }),
      }),
      res,
    );
    expect(Number(saleFromRes(res).total_amount)).toBe(35);
  });

  it("handles floating point cart total (3 × 0.30€)", async () => {
    const unitPrice = 0.3;
    const items = [
      {
        name: "float-a",
        price: unitPrice,
        quantity: 1,
        category_id: categoryId,
        subcategory_id: null,
        weight: 0,
        barcode: "float-a",
      },
      {
        name: "float-b",
        price: unitPrice,
        quantity: 1,
        category_id: categoryId,
        subcategory_id: null,
        weight: 0,
        barcode: "float-b",
      },
      {
        name: "float-c",
        price: unitPrice,
        quantity: 1,
        category_id: categoryId,
        subcategory_id: null,
        weight: 0,
        barcode: "float-c",
      },
    ];
    const total_amount_before_promotion = items.reduce(
      (sum, line) => sum + line.price * line.quantity,
      0,
    );
    expect(total_amount_before_promotion).toBeCloseTo(0.9, 10);
    expect(total_amount_before_promotion).not.toBe(0.9);

    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items,
          total_amount_before_promotion,
          total_amount: total_amount_before_promotion,
          payment_amount: total_amount_before_promotion,
          payments: [
            { method: "cash", amount: total_amount_before_promotion },
          ],
        }),
      }),
      res,
    );

    const txId = res.json.mock.calls[0][0].data.id;
    const tx = await SalesTransaction.findByPk(txId);
    expect(Number(tx.total_amount)).toBeCloseTo(0.9, 2);
  });
});
