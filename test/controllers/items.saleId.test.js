import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  createLabeledItem,
  getItemFromBarcode,
  listLabeledItem,
  tagItemAsSell,
  updateItem,
} from "../../src/v1/controllers/items";
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

const { Category, LabeledItem, SalesTransaction } = db;

/** `sale_id` on every labeled item endpoint: the most recent Sale listing the item. */
describe("labeled item sale_id", () => {
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
    const category = await Category.create({ name: "SaleIdCat", IO: 0 });
    categoryId = category.id;
  });

  const newItem = () =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: user.id,
      price: 10,
      weight: 1,
      status: "available",
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

  const byBarcode = async (item) => {
    const res = makeRes();
    await getItemFromBarcode(makeReq({ params: { barcode: item.id } }), res);
    return res.json.mock.calls[0][0].data;
  };

  const fromList = async (item) => {
    const res = makeRes();
    await listLabeledItem(makeReq({ query: {} }), res);
    return res.json.mock.calls[0][0].data.find((row) => row.id === item.id);
  };

  it("is null for an item never sold, on list and barcode lookup", async () => {
    const item = await newItem();

    expect(await byBarcode(item)).toMatchObject({ id: item.id, sale_id: null });
    expect(await fromList(item)).toMatchObject({ id: item.id, sale_id: null });
  });

  it("is the Sale's id for an item sold through a Sale", async () => {
    const item = await newItem();
    const saleId = await sell(item);

    expect(await byBarcode(item)).toMatchObject({
      status: "sold",
      sale_id: saleId,
    });
    expect(await fromList(item)).toMatchObject({ sale_id: saleId });
  });

  it("stays the Sale's id, not the Refund's, once the item is refunded", async () => {
    const item = await newItem();
    const saleId = await sell(item);
    const refundId = await refund(saleId, item);
    expect(refundId).not.toBe(saleId);

    expect(await byBarcode(item)).toMatchObject({ sale_id: saleId });
    expect(await fromList(item)).toMatchObject({ sale_id: saleId });
  });

  it("is null for an item marked sold by hand", async () => {
    const item = await newItem();
    await tagItemAsSell(makeReq({ user, params: { id: item.id } }), makeRes());

    expect(await byBarcode(item)).toMatchObject({
      status: "sold",
      sale_id: null,
    });
  });

  it("is null, and the item is available, once its Sale is cancelled", async () => {
    const item = await newItem();
    const saleId = await sell(item);
    await removeTransaction(
      makeReq({ user, params: { id: saleId } }),
      makeRes(),
    );

    expect(await byBarcode(item)).toMatchObject({
      status: "available",
      sale_id: null,
    });
    expect(await fromList(item)).toMatchObject({ sale_id: null });
  });

  it("is the most recent Sale when several Sales list the item", async () => {
    const item = await newItem();
    const first = await sell(item);
    const later = await SalesTransaction.create({
      cash_session_id: sessionId,
      total_amount_before_promotion: 10,
      total_amount: 10,
      payment_method: "cash",
      payment_amount: 10,
      transactionType: "sell",
      createdAt: new Date(Date.now() + 60_000),
    });
    await later.addItem(item, {
      through: { name: "again", price: 10, quantity: 1 },
    });
    expect(later.id).not.toBe(first);

    expect(await byBarcode(item)).toMatchObject({ sale_id: later.id });
  });

  it("ignores a transaction that is not completed", async () => {
    const item = await newItem();
    const pending = await SalesTransaction.create({
      cash_session_id: sessionId,
      total_amount_before_promotion: 10,
      total_amount: 10,
      payment_method: "cash",
      payment_amount: 10,
      transactionType: "sell",
      status: "pending",
    });
    await pending.addItem(item, {
      through: { name: "pending", price: 10, quantity: 1 },
    });

    expect(await byBarcode(item)).toMatchObject({ sale_id: null });
  });

  it("is on created items (null) and on the updated item", async () => {
    const createRes = makeRes();
    await createLabeledItem(
      makeReq({
        user,
        body: {
          description: "fresh",
          category_id: categoryId,
          weight: 1,
          price: 10,
          recyclery_id: recycleryId,
          quantity: 2,
        },
      }),
      createRes,
    );
    const created = createRes.json.mock.calls[0][0].data;
    expect(created).toHaveLength(2);
    for (const row of created) expect(row).toHaveProperty("sale_id", null);

    const sold = await newItem();
    const saleId = await sell(sold);
    const updateRes = makeRes();
    await updateItem(
      makeReq({
        user,
        params: { id: sold.id },
        body: {
          description: "renamed",
          category_id: categoryId,
          weight: 1,
          price: 10,
        },
      }),
      updateRes,
    );
    expect(updateRes.json.mock.calls[0][0].data).toMatchObject({
      description: "renamed",
      sale_id: saleId,
    });
  });
});
