import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  createRefund,
  createTransaction,
} from "../../src/v1/controllers/salesTransactions";
import {
  createCashRegister,
  createOpenSession,
  createRecyclery,
  createUser,
  makeSaleBody,
} from "../models/helpers.js";
import { expectHttpError, makeReq, makeRes } from "./helpers.js";

const { Category, LabeledItem } = db;

describe("refund rules", () => {
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
    const register = await createCashRegister(recyclery.id);
    const session = await createOpenSession({
      registerId: register.id,
      userId: user.id,
    });
    sessionId = session.id;

    const category = await Category.create({ name: "RefundCat", IO: 0 });
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

  it("rejects refund for non-existent transaction", async () => {
    const res = makeRes();
    await expectHttpError(
      () =>
        createRefund(
          makeReq({
            params: { id: 999 },
            user: { id: userId, role: "admin" },
            body: {
              cash_session_id: sessionId,
              total_amount: 10,
              refund_reason: "test",
              items: [
                {
                  name: "x",
                  price: 10,
                  quantity: 1,
                  category_id: categoryId,
                  weight: 0,
                  barcode: "1",
                },
              ],
            },
          }),
          res,
        ),
      404,
    );
  });

  it("rejects refund quantity greater than sold", async () => {
    const item = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: userId,
      price: 10,
      weight: 0,
      status: "available",
    });

    const saleRes = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload(item)],
        }),
      }),
      saleRes,
    );
    const saleId = saleRes.json.mock.calls[0][0].data.id;

    const refundRes = makeRes();
    await expectHttpError(
      () =>
        createRefund(
          makeReq({
            params: { id: saleId },
            user: { id: userId, role: "admin" },
            body: {
              cash_session_id: sessionId,
              total_amount: 990,
              payment_method: "cash",
              refund_reason: "too much",
              items: [makeItemPayload(item, { quantity: 99 })],
            },
          }),
          refundRes,
        ),
      400,
    );
  });

  it("rejects second refund that exceeds remaining quantity", async () => {
    const item = await LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: userId,
      price: 20,
      weight: 0,
      status: "available",
    });

    const saleRes = makeRes();
    await createTransaction(
      makeReq({
        user: { id: userId, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [makeItemPayload(item, { quantity: 2 })],
        }),
      }),
      saleRes,
    );
    const saleId = saleRes.json.mock.calls[0][0].data.id;

    const partialRes = makeRes();
    await createRefund(
      makeReq({
        params: { id: saleId },
        user: { id: userId, role: "admin" },
        body: {
          cash_session_id: sessionId,
          total_amount: 20,
          payment_method: "cash",
          refund_reason: "partial",
          items: [makeItemPayload(item, { quantity: 1 })],
        },
      }),
      partialRes,
    );

    const excessRes = makeRes();
    await expectHttpError(
      () =>
        createRefund(
          makeReq({
            params: { id: saleId },
            user: { id: userId, role: "admin" },
            body: {
              cash_session_id: sessionId,
              total_amount: 40,
              payment_method: "cash",
              refund_reason: "excess",
              items: [makeItemPayload(item, { quantity: 2 })],
            },
          }),
          excessRes,
        ),
      400,
    );
  });
});
