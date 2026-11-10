import { beforeAll, describe, expect, it } from "@jest/globals";
import { getCartLinePrice } from "@recyclerie/api/domain/cart";
import db from "../../src/models/index";
import {
  createTransaction,
  transactionsStats,
} from "../../src/v1/controllers/salesTransactions";
import {
  createCashRegister,
  createOpenSession,
  createRecyclery,
  createUser,
  makeSaleBody,
} from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const { Category, LabeledItem } = db;

describe("transactionsStats by_category line totals", () => {
  /** @type {import("../../src/models/user.js").default} */
  let owner;
  let recycleryId;
  let sessionId;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    owner = await createUser({ role: "admin" });
    const recyclery = await createRecyclery();
    recycleryId = recyclery.id;
    const register = await createCashRegister(recyclery.id);
    const session = await createOpenSession({
      registerId: register.id,
      userId: owner.id,
    });
    sessionId = session.id;
  });

  // One category per sale, so each by_category row holds exactly one line.
  const sellOneLine = async (categoryName, lineOverrides) => {
    const category = await Category.create({ name: categoryName, IO: 0 });
    const item = await LabeledItem.create({
      category_id: category.id,
      recyclery_id: recycleryId,
      created_by: owner.id,
      price: lineOverrides.price,
      weight: 0,
      status: "available",
    });
    const line = {
      name: `item-${item.id}`,
      quantity: 1,
      category_id: category.id,
      subcategory_id: null,
      weight: 0,
      barcode: String(item.id),
      promotion: 0,
      bundlePrice: null,
      bundleQuantity: null,
      ...lineOverrides,
    };
    const lineTotal = getCartLinePrice(line);
    const res = makeRes();
    await createTransaction(
      makeReq({
        user: { id: owner.id, role: "admin" },
        body: makeSaleBody({
          sessionId,
          items: [line],
          total_amount_before_promotion: lineTotal,
          total_amount: lineTotal,
        }),
      }),
      res,
    );
    expect(res.json).toHaveBeenCalled();
    return category.id;
  };

  const categoryRow = async (categoryId) => {
    const res = makeRes();
    await transactionsStats(
      makeReq({ query: { store_id: String(recycleryId) }, user: owner }),
      res,
    );
    const { by_category } = res.json.mock.calls[0][0].data;
    const row = by_category.find(
      (r) => Number(r.category_id) === Number(categoryId),
    );
    expect(row).toBeDefined();
    return row;
  };

  it("applies a per-line promotion to a plain line", async () => {
    const categoryId = await sellOneLine("PromoPlain", {
      price: 10,
      quantity: 1,
      promotion: 20,
    });

    const row = await categoryRow(categoryId);

    // 10 € at 20 % off
    expect(Number(row.total_price_sum)).toBeCloseTo(8, 2);
    expect(Number(row.total_quantity)).toBe(1);
  });

  it("applies a per-line promotion to both the bundle and the leftover units", async () => {
    // 7 units, bundles of 3 for 10 €, unit price 5 €, 20 % off:
    //   2 bundles * 10 € * 0.8 = 16 €
    //   1 leftover *  5 € * 0.8 =  4 €
    const categoryId = await sellOneLine("PromoBundle", {
      price: 5,
      quantity: 7,
      bundleQuantity: 3,
      bundlePrice: 10,
      promotion: 20,
    });

    const row = await categoryRow(categoryId);

    expect(Number(row.total_price_sum)).toBeCloseTo(20, 2);
    expect(Number(row.total_quantity)).toBe(7);
  });
});
