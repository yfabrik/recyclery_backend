import db from "../../src/models/index";
import { createRecyclery, createCollectionPoint } from "./helpers.js";

const { Task, TaskSchedule, Recyclery, CollectionPoint } = db;

describe("Task Model", () => {
  describe("CRUD", () => {
    it("should create a task linked to schedule and store", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        scheduled_date: new Date("2030-06-02"),
        start_time: new Date("2030-06-02T09:00:00Z"),
        end_time: new Date("2030-06-02T17:00:00Z"),
        is_recurring: false,
      });
      const task = await Task.create({
        schedule_id: schedule.id,
        store_id: recyclery.id,
        name: "Opening",
        category: "vente",
        scheduled_date: new Date("2030-06-02"),
        start_time: new Date("2030-06-02T09:00:00Z"),
        end_time: new Date("2030-06-02T17:00:00Z"),
      });
      expect(task.id).toBeDefined();
      expect(task.schedule_id).toBe(schedule.id);
      expect(task.store_id).toBe(recyclery.id);
      expect(task.name).toBe("Opening");
      expect(task.category).toBe("vente");
    });

    it("should read a task by primary key", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        scheduled_date: new Date("2030-07-01"),
        start_time: new Date("2030-07-01T10:00:00Z"),
        end_time: new Date("2030-07-01T12:00:00Z"),
        is_recurring: false,
      });
      const created = await Task.create({
        schedule_id: schedule.id,
        store_id: recyclery.id,
        name: "ReadTest",
        category: "custom",
        scheduled_date: new Date("2030-07-01"),
        start_time: new Date("2030-07-01T10:00:00Z"),
        end_time: new Date("2030-07-01T12:00:00Z"),
      });
      const found = await Task.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a task", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "point",
        scheduled_date: new Date("2030-08-01"),
        start_time: new Date("2030-08-01T08:00:00Z"),
        end_time: new Date("2030-08-01T16:00:00Z"),
        is_recurring: false,
      });
      const created = await Task.create({
        schedule_id: schedule.id,
        store_id: recyclery.id,
        name: "Before",
        category: "point",
        scheduled_date: new Date("2030-08-01"),
        start_time: new Date("2030-08-01T08:00:00Z"),
        end_time: new Date("2030-08-01T16:00:00Z"),
      });
      await created.update({ name: "After", notes: "Updated" });
      const reloaded = await Task.findByPk(created.id);
      expect(reloaded.name).toBe("After");
      expect(reloaded.notes).toBe("Updated");
    });

    it("should delete a task", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "collection",
        scheduled_date: new Date("2030-09-01"),
        start_time: new Date("2030-09-01T09:00:00Z"),
        end_time: new Date("2030-09-01T15:00:00Z"),
        is_recurring: false,
      });
      const created = await Task.create({
        schedule_id: schedule.id,
        store_id: recyclery.id,
        name: "ToDelete",
        category: "collection",
        scheduled_date: new Date("2030-09-01"),
        start_time: new Date("2030-09-01T09:00:00Z"),
        end_time: new Date("2030-09-01T15:00:00Z"),
      });
      const id = created.id;
      await created.destroy();
      const found = await Task.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
