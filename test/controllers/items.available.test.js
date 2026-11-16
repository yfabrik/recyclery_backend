import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import { tagItemAsAvailable } from "../../src/v1/controllers/items";
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

/** `POST /api/labeled-items/:id/available`: the reverse of mark-as-sold. */
describe("putting a labeled item back in stock", () => {
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
    const category = await Category.create({ name: "AvailableCat", IO: 0 });
    categoryId = category.id;
  });

  const newItem = (status = "available") =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: user.id,
      price: 10,
      weight: 1,
      status,
    });

  const line = (item) => ({
    name: `item-${item.id}`,
    price: Number(item.price),
    quantity: 1,
    category_id: item.category_id,
    subcategory_id: null,
    weight: Number(item.weight),
    barcode: String(item.id),
    promotion: 0,
    bundlePrice: null,
    bundleQuantity: null,
  });

  const sell = async (item) => {
    const res = makeRes();
    await createTransaction(
      makeReq({ user, body: makeSaleBody({ sessionId, items: [line(item)] }) }),
      res,
    );
    return res.json.mock.calls[0][0].data.id;
  };

  const refund = async (saleId, item) => {
    const res = makeRes();
    await createRefund(
      makeReq({
        params: { id: saleId },
        user,
        body: {
          cash_session_id: sessionId,
          total_amount: Number(item.price),
          payment_method: "cash",
          refund_reason: "test",
          items: [line(item)],
        },
      }),
      res,
    );
    return res.json.mock.calls[0][0].data.id;
  };

  const putBack = (id) =>
    tagItemAsAvailable(makeReq({ user, params: { id } }), makeRes());

  const statusOf = async (item) => (await LabeledItem.findByPk(item.id)).status;

  it("makes a sold item with no transaction lines available", async () => {
    const item = await newItem("sold");
    const res = makeRes();

    await tagItemAsAvailable(makeReq({ user, params: { id: item.id } }), res);

    expect(await statusOf(item)).toBe("available");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it("refuses an item that is already available, and leaves it unchanged", async () => {
    const item = await newItem("available");

    await expectHttpError(() => putBack(item.id), 400);
    expect(await statusOf(item)).toBe("available");
  });

  it("refuses an item listed by a Sale, which stays sold", async () => {
    const item = await newItem();
    await sell(item);
    expect(await statusOf(item)).toBe("sold");

    await expectHttpError(() => putBack(item.id), 424);
    expect(await statusOf(item)).toBe("sold");
  });

  it("refuses an item listed by a Sale and a Refund, which stays sold", async () => {
    const item = await newItem();
    const saleId = await sell(item);
    await refund(saleId, item);
    expect(await statusOf(item)).toBe("sold");

    await expectHttpError(() => putBack(item.id), 424);
    expect(await statusOf(item)).toBe("sold");
  });

  it("answers 404 for an unknown item", async () => {
    expect.assertions(1);
    await expectHttpError(() => putBack(999999), 404);
  });
});
