import db from "../../src/models/index";
import { createRecyclery, createUser } from "./helpers.js";

const { CashRegister, CashSession } = db;

describe("CashSession Model", () => {
  describe("CRUD", () => {
    let recyclery;
    let user;
    let cashRegister;

    beforeAll(async () => {
      recyclery = await createRecyclery();
      user = await createUser();
      cashRegister = await CashRegister.create({
        name: "Caisse Test",
        recyclery_id: recyclery.id,
      });
    });

    it("should create a cash session", async () => {
      const session = await CashSession.create({
        cash_register_id: cashRegister.id,
        user_id: user.id,
        opening_amount: 100.5,
        status: "open",
      });
      expect(session.id).toBeDefined();
      expect(session.opening_amount).toBeDefined();
      expect(session.status).toBe("open");
    });

    it("should read a cash session by primary key", async () => {
      const created = await CashSession.create({
        cash_register_id: cashRegister.id,
        user_id: user.id,
        opening_amount: 50,
      });
      const found = await CashSession.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(Number(found.opening_amount)).toBe(50);
    });

    it("should update a cash session", async () => {
      const created = await CashSession.create({
        cash_register_id: cashRegister.id,
        user_id: user.id,
        opening_amount: 75,
      });
      await created.update({
        status: "close",
        closing_amount: 80,
        closed_at: new Date(),
      });
      const reloaded = await CashSession.findByPk(created.id);
      expect(reloaded.status).toBe("close");
      expect(Number(reloaded.closing_amount)).toBe(80);
    });

    it("should delete a cash session", async () => {
      const created = await CashSession.create({
        cash_register_id: cashRegister.id,
        user_id: user.id,
        opening_amount: 25,
      });
      const id = created.id;
      await created.destroy();
      const found = await CashSession.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
