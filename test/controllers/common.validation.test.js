import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import { createCaisse } from "../../src/v1/controllers/cashRegister";
import { createCategorie } from "../../src/v1/controllers/categories";
import { createCollectionPoint } from "../../src/v1/controllers/collectionPoints";
import { createRecyclerie } from "../../src/v1/controllers/recycleries";
import { openCashSession } from "../../src/v1/controllers/cashSession";
import { createTransaction } from "../../src/v1/controllers/salesTransactions";
import { createRecyclery, createUser } from "../models/helpers.js";
import { expectHttpError, makeReq, makeRes } from "./helpers.js";

const { Category, Recyclery, CashRegister } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

describe("cross-cutting validation rules", () => {
  describe("name trim", () => {
    it("trims category name on create", async () => {
      const res = makeRes();
      await createCategorie(
        makeReq({ body: { name: "  TrimCat  " } }),
        res,
      );
      const cat = await Category.findByPk(res.json.mock.calls[0][0].data.id);
      expect(cat.name).toBe("TrimCat");
    });

    it("trims cash register name on create", async () => {
      const store = await createRecyclery();
      const res = makeRes();
      await createCaisse(
        makeReq({
          body: { name: "  TrimRegister  ", store_id: store.id },
        }),
        res,
      );
      const reg = await CashRegister.findByPk(res.json.mock.calls[0][0].data.id);
      expect(reg.name).toBe("TrimRegister");
    });

    it("trims store name on create", async () => {
      const res = makeRes();
      await createRecyclerie(
        makeReq({
          body: {
            name: "  TrimStore  ",
            address: "1 rue Test",
            email: "trim@test.com",
          },
        }),
        res,
      );
      const store = await Recyclery.findByPk(
        res.json.mock.calls[0][0].data.id,
      );
      expect(store.name).toBe("TrimStore");
    });

    it("trims collection point name on create", async () => {
      const res = makeRes();
      await createCollectionPoint(
        makeReq({
          body: {
            name: "  TrimPoint  ",
            address: "addr",
            city: "city",
            postal_code: "39000",
          },
        }),
        res,
      );
      expect(res.json.mock.calls[0][0].data.name).toBe("TrimPoint");
    });
  });

  describe("fake FK", () => {
    it("rejects cash register with non-existent store", async () => {
      const res = makeRes();
      await expectHttpError(
        () =>
          createCaisse(
            makeReq({ body: { name: "Caisse", store_id: 999 } }),
            res,
          ),
        404,
      );
    });

    it("rejects sale with non-existent cash session", async () => {
      const res = makeRes();
      await expectHttpError(
        () =>
          createTransaction(
            makeReq({
              body: {
                cash_session_id: 999,
                total_amount: 10,
                total_amount_before_promotion: 10,
                payment_amount: 10,
                payments: [{ method: "cash", amount: 10 }],
                items: [
                  {
                    name: "x",
                    price: 10,
                    quantity: 1,
                    category_id: 1,
                    weight: 0,
                    barcode: "999",
                  },
                ],
              },
            }),
            res,
          ),
        404,
      );
    });
  });

  describe("required FK", () => {
    it("rejects opening session without valid cash register", async () => {
      const user = await createUser();
      const store = await createRecyclery();
      const res = makeRes();
      await expectHttpError(
        () =>
          openCashSession(
            makeReq({
              user: { id: user.id, role: "admin" },
              body: {
                cash_register_id: 999,
                store_id: store.id,
                opening_amount: 100,
              },
            }),
            res,
          ),
        404,
      );
    });
  });
});
