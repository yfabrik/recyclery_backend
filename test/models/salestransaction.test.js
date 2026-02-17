import db from "../../src/models/index.js";
import { createRecyclery, createUser } from "./helpers.js";

const { CashRegister, CashSession, SalesTransaction } = db;

describe("SalesTransaction Model", () => {
  describe("CRUD", () => {
    it("should create a sales transaction", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({ name: "Caisse", recyclery_id: recyclery.id });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
      });
      const tx = await SalesTransaction.create({
        cash_session_id: session.id,
        created_by: user.id,
        payment_method: "cash",
        total_amount: 25.5,
        payment_amount: 30,
        status: "completed",
      });
      expect(tx.id).toBeDefined();
      expect(Number(tx.total_amount)).toBe(25.5);
      expect(tx.payment_method).toBe("cash");
      expect(tx.status).toBe("completed");
    });

    it("should read a sales transaction by primary key", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({ name: "Caisse2", recyclery_id: recyclery.id });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
      });
      const created = await SalesTransaction.create({
        cash_session_id: session.id,
        created_by: user.id,
        payment_method: "card",
        status: "pending",
      });
      const found = await SalesTransaction.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.payment_method).toBe("card");
    });

    it("should update a sales transaction", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({ name: "Caisse3", recyclery_id: recyclery.id });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
      });
      const created = await SalesTransaction.create({
        cash_session_id: session.id,
        created_by: user.id,
        payment_method: "check",
        status: "pending",
      });
      await created.update({ status: "completed" });
      const reloaded = await SalesTransaction.findByPk(created.id);
      expect(reloaded.status).toBe("completed");
    });

    it("should delete a sales transaction", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({ name: "Caisse4", recyclery_id: recyclery.id });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
      });
      const created = await SalesTransaction.create({
        cash_session_id: session.id,
        created_by: user.id,
        payment_method: "cash",
      });
      const id = created.id;
      await created.destroy();
      const found = await SalesTransaction.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
