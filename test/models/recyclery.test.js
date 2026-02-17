import db from "../../src/models/index.js";
import { createRecyclery, createUser } from "./helpers.js";

const { Recyclery, CashRegister, CashSession } = db;

describe("Recyclery Model", () => {
  describe("delete with open cash session", () => {
    it("should allow delete when no open cash session", async () => {
      const recyclery = await createRecyclery({ name: "NoOpenSession" });
      const user = await createUser();
      const cr = await CashRegister.create({
        name: "Caisse Closed",
        recyclery_id: recyclery.id,
      });
      await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 100,
        status: "close",
        closing_amount: 100,
        closed_at: new Date(),
      });
      const id = recyclery.id;
      await recyclery.destroy();
      const found = await Recyclery.findByPk(id);
      expect(found).toBeNull();
    });

    it("should forbid delete when a cash session is open", async () => {
      const recyclery = await createRecyclery({ name: "WithOpenSession" });
      const user = await createUser();
      const cr = await CashRegister.create({
        name: "Caisse Open",
        recyclery_id: recyclery.id,
      });
      await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 50,
        status: "open",
      });
      await expect(recyclery.destroy()).rejects.toThrow();
      const found = await Recyclery.findByPk(recyclery.id);
      expect(found).not.toBeNull();
    });
  });

  describe("CRUD", () => {
    it("should create a recyclery", async () => {
      const r = await createRecyclery({
        name: "Eco Center",
        address: "123 Green St",
        email: "eco@center.com",
      });
      expect(r.id).toBeDefined();
      expect(r.name).toBe("Eco Center");
      expect(r.address).toBe("123 Green St");
      expect(r.email).toBe("eco@center.com");
      expect(r.is_active).toBe(true);
    });

    it("should read a recyclery by primary key", async () => {
      const created = await createRecyclery({ name: "ReadTest" });
      const found = await Recyclery.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a recyclery", async () => {
      const created = await createRecyclery({ name: "BeforeUpdate" });
      await created.update({ name: "AfterUpdate", city: "Paris" });
      const reloaded = await Recyclery.findByPk(created.id);
      expect(reloaded.name).toBe("AfterUpdate");
      expect(reloaded.city).toBe("Paris");
    });

    it("should delete a recyclery when no open cash session", async () => {
      const created = await createRecyclery({ name: "ToDelete" });
      const id = created.id;
      await created.destroy();
      const found = await Recyclery.findByPk(id);
      expect(found).toBeNull();
    });
  });

  describe("cascade on delete", () => {
    it("should remove CashRegisters and TaskSchedules when recyclery is deleted", async () => {
      const recyclery = await createRecyclery({ name: "CascadeTest" });
      const cr = await CashRegister.create({
        name: "Caisse Cascade",
        recyclery_id: recyclery.id,
      });
      const schedule = await db.TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        scheduled_date: new Date("2030-05-01"),
        start_time: new Date("2030-05-01T09:00:00Z"),
        end_time: new Date("2030-05-01T17:00:00Z"),
        is_recurring: false,
      });
      const recycleryId = recyclery.id;
      const crId = cr.id;
      const scheduleId = schedule.id;
      await recyclery.destroy();
      const foundRecyclery = await Recyclery.findByPk(recycleryId);
      const foundSchedule = await db.TaskSchedule.findByPk(scheduleId);
      expect(foundRecyclery).toBeNull();
      expect(foundSchedule).toBeNull();
      const foundCr = await CashRegister.findByPk(crId);
      expect(foundCr === null || foundCr.recyclery_id === null).toBe(true);
    });
  });
});
