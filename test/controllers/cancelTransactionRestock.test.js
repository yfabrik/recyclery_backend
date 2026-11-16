import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  createRefund,
  createTransaction,
  removeTransaction,
  updateTransaction,
} from "../../src/v1/controllers/salesTransactions";
import {
  createCashRegister,
  createOpenSession,
  createRecyclery,
  createUser,
  makeSaleBody,
} from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const { Category, LabeledItem, SalesTransaction, TransactionItem } = db;

describe("cancelling a transaction restocks an item only when no Sale lists it", () => {
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

    const category = await Category.create({ name: "RestockCat", IO: 0 });
    categoryId = category.id;
  });

  const makeLabeledItem = (price = 10) =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: user.id,
      price,
      weight: 0,
      status: "available",
    });

  const makeItemPayload = (item, overrides = {}) => ({
    name: `item-${item.id}`,
    price: Number(item.price),
    quantity: 1,
    category_id: item.category_id,
    subcategory_id: null,
    weight: Number(item.weight),
    barcode: item.barcode,
    promotion: 0,
    bundlePrice: null,
    bundleQuantity: null,
    ...overrides,
  });

  const createSale = async (items) => {
    const res = makeRes();
    await createTransaction(
      makeReq({
        user,
        body: makeSaleBody({
          sessionId,
          items: items.map((item) => makeItemPayload(item)),
        }),
      }),
      res,
    );
    return res.json.mock.calls[0][0].data.id;
  };

  const refundSale = async (saleId, item) => {
    const res = makeRes();
    await createRefund(
      makeReq({
        params: { id: saleId },
        user,
        body: {
          cash_session_id: sessionId,
          total_amount: Number(item.price),
          payment_method: "cash",
          refund_reason: "cancel test",
          items: [makeItemPayload(item)],
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    return res.json.mock.calls[0][0].data.refund.id;
  };

  const cancel = async (id) => {
    const res = makeRes();
    await removeTransaction(makeReq({ params: { id }, user }), res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  };

  const statusOf = async (item) => (await LabeledItem.findByPk(item.id)).status;

  it("cancelling a Refund keeps its items sold, still listed by their Sale", async () => {
    const item = await makeLabeledItem();
    const saleId = await createSale([item]);
    const refundId = await refundSale(saleId, item);

    await cancel(refundId);

    expect(await SalesTransaction.findByPk(refundId)).toBeNull();
    expect(await statusOf(item)).toBe("sold");
    const saleLine = await TransactionItem.findOne({
      where: { transaction_id: saleId, labeled_item_id: item.id },
    });
    expect(saleLine).not.toBeNull();
  });

  it("a Sale whose only Refund was cancelled can be cancelled, and restocks its items", async () => {
    const item = await makeLabeledItem();
    const saleId = await createSale([item]);
    const refundId = await refundSale(saleId, item);
    await cancel(refundId);

    await cancel(saleId);

    expect(await SalesTransaction.findByPk(saleId)).toBeNull();
    expect(await statusOf(item)).toBe("available");
  });

  it("cancelling a Sale puts its items back to available", async () => {
    const a = await makeLabeledItem();
    const b = await makeLabeledItem();
    const saleId = await createSale([a, b]);
    expect(await statusOf(a)).toBe("sold");

    await cancel(saleId);

    expect(await statusOf(a)).toBe("available");
    expect(await statusOf(b)).toBe("available");
  });

  it("removing a line while editing a Sale puts that item back to available", async () => {
    const kept = await makeLabeledItem();
    const removed = await makeLabeledItem();
    const saleId = await createSale([kept, removed]);

    const res = makeRes();
    await updateTransaction(
      makeReq({
        params: { id: saleId },
        user,
        body: makeSaleBody({ sessionId, items: [makeItemPayload(kept)] }),
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );

    expect(await statusOf(removed)).toBe("available");
    expect(await statusOf(kept)).toBe("sold");
  });

  it("an item listed by two Sales stays sold when one of them is cancelled", async () => {
    const item = await makeLabeledItem();
    const firstSaleId = await createSale([item]);
    // A second Sale listing the same item (possible before Sales refused sold
    // items), attached directly so it doesn't depend on the creation rules.
    const otherItem = await makeLabeledItem();
    const secondSaleId = await createSale([otherItem]);
    const secondSale = await SalesTransaction.findByPk(secondSaleId);
    await secondSale.addItem(item, {
      through: { name: `item-${item.id}`, price: Number(item.price), quantity: 1 },
    });

    await cancel(firstSaleId);

    expect(await statusOf(item)).toBe("sold");

    await cancel(secondSaleId);

    expect(await statusOf(item)).toBe("available");
  });
});
