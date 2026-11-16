import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import db from "../../src/models/index";
import { createTransaction } from "../../src/v1/controllers/salesTransactions";
import { createRecyclery, createUser, makeSaleBody } from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const {
  CashRegister,
  CashSession,
  Category,
  GiftCardTransaction,
  LabeledItem,
  SalesTransaction,
  TransactionItem,
  TransactionPayment,
} = db;

const lineFor = (item, quantity = 1) => ({
  name: `item-${item.id}`,
  price: Number(item.price),
  quantity,
  category_id: item.category_id,
  subcategory_id: null,
  weight: Number(item.weight),
  barcode: String(item.barcode),
  promotion: 0,
  bundlePrice: null,
  bundleQuantity: null,
});

describe("a Sale refuses an item that is already sold", () => {
  let user;
  let sessionId;
  let categoryId;
  let recycleryId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    user = await createUser({ role: "admin" });
    const recyclery = await createRecyclery();
    recycleryId = recyclery.id;
    const register = await CashRegister.create({
      name: "Sold items register",
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
    const category = await Category.create({ name: "SoldCat", IO: 0 });
    categoryId = category.id;
  });

  const makeItem = (price, overrides = {}) =>
    LabeledItem.create({
      category_id: categoryId,
      recyclery_id: recycleryId,
      created_by: user.id,
      price,
      weight: 0,
      status: "available",
      ...overrides,
    });

  const sell = async (items) => {
    const res = makeRes();
    await createTransaction(
      makeReq({ user, body: makeSaleBody({ sessionId, items }) }),
      res,
    );
    return res.json.mock.calls[0][0].data;
  };

  const counts = async () => ({
    sales: await SalesTransaction.count(),
    lines: await TransactionItem.count(),
    payments: await TransactionPayment.count(),
    giftCardMoves: await GiftCardTransaction.count(),
  });

  it("refuses a Sale with an already sold item and saves nothing", async () => {
    const item = await makeItem(10, { status: "sold" });
    const before = await counts();

    await expect(sell([lineFor(item)])).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Article non disponible"),
    });
    await expect(sell([lineFor(item)])).rejects.toMatchObject({
      message: expect.stringContaining(item.barcode),
    });

    expect(await counts()).toEqual(before);
    await item.reload();
    expect(item.status).toBe("sold");
  });

  it("refuses the second of two Sales with the same item, which stays in the first", async () => {
    const item = await makeItem(12);
    const first = await sell([lineFor(item)]);
    const before = await counts();

    await expect(sell([lineFor(item)])).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Article non disponible"),
    });

    expect(await counts()).toEqual(before);
    const lines = await TransactionItem.findAll({
      where: { labeled_item_id: item.id },
    });
    expect(lines.map((l) => l.transaction_id)).toEqual([first.id]);
    await item.reload();
    expect(item.status).toBe("sold");
  });

  // SQLite in memory runs on one connection, so two Sales can't really race
  // here. What makes the race safe is that the check lives in the UPDATE's
  // WHERE: on MariaDB the second UPDATE waits on the row lock, then matches
  // nothing. Pin that.
  it("checks and changes the status in one conditional update", async () => {
    const item = await makeItem(8);
    const update = jest.spyOn(LabeledItem, "update");
    const findByPk = jest.spyOn(LabeledItem, "findByPk");
    try {
      await sell([lineFor(item)]);

      expect(findByPk).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        { status: "sold" },
        expect.objectContaining({
          where: { id: item.id, status: "available" },
          transaction: expect.anything(),
        }),
      );
    } finally {
      update.mockRestore();
      findByPk.mockRestore();
    }
  });

  it("accepts a labeled line with quantity 2", async () => {
    const item = await makeItem(5);
    const sale = await sell([lineFor(item, 2)]);

    expect(Number(sale.transaction.total_amount)).toBe(10);
    const line = await TransactionItem.findOne({
      where: { labeled_item_id: item.id },
    });
    expect(line.quantity).toBe(2);
    await item.reload();
    expect(item.status).toBe("sold");
  });

  it("accepts a line without a barcode", async () => {
    const sale = await sell([
      {
        name: "Livres",
        price: 3,
        quantity: 1,
        category_id: categoryId,
        subcategory_id: null,
        weight: 1,
        barcode: "MANUAL1784199602203",
        promotion: 0,
        bundlePrice: null,
        bundleQuantity: null,
      },
    ]);

    expect(Number(sale.transaction.total_amount)).toBe(3);
    expect(sale.transaction.items).toHaveLength(1);
  });

  it("refuses a Sale mixing an available item and a sold one, as a whole", async () => {
    const available = await makeItem(20);
    const sold = await makeItem(30, { status: "sold" });
    const before = await counts();

    await expect(
      sell([lineFor(available), lineFor(sold)]),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining(sold.barcode),
    });

    expect(await counts()).toEqual(before);
    await available.reload();
    expect(available.status).toBe("available");
  });

  it("still answers 404 for a barcode that matches no item", async () => {
    const item = await makeItem(4);
    const ghost = { ...lineFor(item), barcode: "999999999999" };

    await expect(sell([ghost])).rejects.toMatchObject({ status: 404 });
  });
});
