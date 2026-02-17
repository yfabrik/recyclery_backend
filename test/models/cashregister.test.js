import db from "../../src/models/index.js";
import { createRecyclery, createUser } from "./helpers.js";

const { CashRegister, CashSession } = db;

describe("CashRegister Model", () => {
  describe("CRUD", () => {
    it("should create a cash register", async () => {
      const recyclery = await createRecyclery();
      const cr = await CashRegister.create({
        name: "Caisse 1",
        recyclery_id: recyclery.id,
      });
      expect(cr.id).toBeDefined();
      expect(cr.name).toBe("Caisse 1");
      expect(cr.recyclery_id).toBe(recyclery.id);
      expect(cr.is_active).toBe(true);
    });

    it("should read a cash register by primary key", async () => {
      const recyclery = await createRecyclery();
      const created = await CashRegister.create({
        name: "ReadTest",
        recyclery_id: recyclery.id,
      });
      const found = await CashRegister.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a cash register", async () => {
      const recyclery = await createRecyclery();
      const created = await CashRegister.create({
        name: "BeforeUpdate",
        recyclery_id: recyclery.id,
      });
      await created.update({ name: "AfterUpdate" });
      const reloaded = await CashRegister.findByPk(created.id);
      expect(reloaded.name).toBe("AfterUpdate");
    });

    it("should delete a cash register when no open session", async () => {
      const recyclery = await createRecyclery();
      const created = await CashRegister.create({
        name: "ToDelete",
        recyclery_id: recyclery.id,
      });
      const id = created.id;
      await created.destroy();
      const found = await CashRegister.findByPk(id);
      expect(found).toBeNull();
    });
  });

  describe("cascade and hooks on delete", () => {
    it("should throw when deleting register with open session", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({
        name: "OpenSession",
        recyclery_id: recyclery.id,
      });
      await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
        status: "open",
      });
      await expect(cr.destroy()).rejects.toThrow();
      const found = await CashRegister.findByPk(cr.id);
      expect(found).not.toBeNull();
    });

    it("should delete register and its sessions when all sessions are closed", async () => {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const cr = await CashRegister.create({
        name: "ClosedSessions",
        recyclery_id: recyclery.id,
      });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
        status: "close",
        closed_at: new Date(),
      });
      const crId = cr.id;
      const sessionId = session.id;
      await cr.destroy();
      expect(await CashRegister.findByPk(crId)).toBeNull();
      expect(await CashSession.findByPk(sessionId)).toBeNull();
    });
  });
});
