import db from "../../src/models/index";
import { createRecyclery, createCollectionPoint } from "./helpers.js";

const { CollectionPoint, TaskSchedule } = db;

describe("CollectionPoint Model", () => {
  describe("CRUD", () => {
    it("should create a collection point", async () => {
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id, {
        name: "Point Alpha",
        address: "10 Rue Test",
        city: "Lyon",
        postal_code: "69001",
      });
      expect(cp.id).toBeDefined();
      expect(cp.name).toBe("Point Alpha");
      expect(cp.recyclery_id).toBe(recyclery.id);
      expect(cp.is_active).toBe(true);
    });

    it("should read a collection point by primary key", async () => {
      const recyclery = await createRecyclery();
      const created = await createCollectionPoint(recyclery.id, {
        name: "ReadTest",
      });
      const found = await CollectionPoint.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a collection point", async () => {
      const recyclery = await createRecyclery();
      const created = await createCollectionPoint(recyclery.id, {
        name: "BeforeUpdate",
      });
      await created.update({ name: "AfterUpdate", city: "Paris" });
      const reloaded = await CollectionPoint.findByPk(created.id);
      expect(reloaded.name).toBe("AfterUpdate");
      expect(reloaded.city).toBe("Paris");
    });

    it("should delete a collection point", async () => {
      const recyclery = await createRecyclery();
      const created = await createCollectionPoint(recyclery.id, {
        name: "ToDelete",
      });
      const id = created.id;
      await created.destroy();
      const found = await CollectionPoint.findByPk(id);
      expect(found).toBeNull();
    });
  });

  describe("cascade on delete", () => {
    it("should remove TaskSchedules when collection point is deleted", async () => {
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id, {
        name: "CP Cascade",
      });
      const schedule = await TaskSchedule.create({
        collection_point_id: cp.id,
        category: "collection",
        scheduled_date: new Date("2030-06-01"),
        start_time: new Date("2030-06-01T09:00:00Z"),
        end_time: new Date("2030-06-01T12:00:00Z"),
        is_recurring: false,
      });
      const scheduleId = schedule.id;
      await cp.destroy();
      expect(await CollectionPoint.findByPk(cp.id)).toBeNull();
      expect(await TaskSchedule.findByPk(scheduleId)).toBeNull();
    });
  });
});
