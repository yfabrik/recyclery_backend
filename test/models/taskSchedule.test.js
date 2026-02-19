import db from "../../src/models/index.js";
import { createRecyclery, createCollectionPoint } from "./helpers.js";

const { TaskSchedule, Task } = db;

describe("TaskSchedule Model", () => {
  describe("CRUD", () => {
    it("should create a task schedule (store) and generate tasks when is_recurring false", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        name: "Opening",
        scheduled_date: new Date("2030-01-15"),
        start_time: new Date("2030-01-15T09:00:00Z"),
        end_time: new Date("2030-01-15T17:00:00Z"),
        is_recurring: false,
      });
      expect(schedule.id).toBeDefined();
      expect(schedule.store_id).toBe(recyclery.id);
      expect(schedule.category).toBe("vente");
      const tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(1);
      expect(tasks[0].scheduled_date).toBeDefined();
    });

    it("should read a task schedule by primary key", async () => {
      const recyclery = await createRecyclery();
      const created = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        scheduled_date: new Date("2030-02-20"),
        start_time: new Date("2030-02-20T10:00:00Z"),
        end_time: new Date("2030-02-20T14:00:00Z"),
        is_recurring: false,
      });
      const found = await TaskSchedule.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.category).toBe("custom");
    });

    it("should update a task schedule", async () => {
      const recyclery = await createRecyclery();
      const created = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "point",
        scheduled_date: new Date("2030-03-10"),
        start_time: new Date("2030-03-10T08:00:00Z"),
        end_time: new Date("2030-03-10T12:00:00Z"),
        is_recurring: false,
      });
      await created.update({ name: "Updated name", notes: "Updated notes" });
      const reloaded = await TaskSchedule.findByPk(created.id);
      expect(reloaded.name).toBe("Updated name");
      expect(reloaded.notes).toBe("Updated notes");
    });

    it("should delete a task schedule", async () => {
      const recyclery = await createRecyclery();
      const created = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "collection",
        scheduled_date: new Date("2030-04-05"),
        start_time: new Date("2030-04-05T09:00:00Z"),
        end_time: new Date("2030-04-05T16:00:00Z"),
        is_recurring: false,
      });
      const id = created.id;
      await created.destroy();
      const found = await TaskSchedule.findByPk(id);
      expect(found).toBeNull();
    });
  });

  describe("cascade on delete", () => {
    it("should set schedule_id to null for past tasks and remove future tasks when schedule is destroyed", async () => {
      const recyclery = await createRecyclery();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        scheduled_date: pastDate,
        start_time: new Date(pastDate.getTime() + 9 * 60 * 60 * 1000),
        end_time: new Date(pastDate.getTime() + 17 * 60 * 60 * 1000),
        is_recurring: false,
      });
      const tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(1);
      const pastTaskId = tasks[0].id;
      await schedule.destroy();
      const pastTaskAfter = await Task.findByPk(pastTaskId);
      expect(pastTaskAfter).not.toBeNull();
      expect(pastTaskAfter.schedule_id).toBeNull();
    });

    it("should remove or orphan future tasks when schedule is destroyed", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        scheduled_date: new Date("2030-12-01"),
        start_time: new Date("2030-12-01T09:00:00Z"),
        end_time: new Date("2030-12-01T17:00:00Z"),
        is_recurring: false,
      });
      const tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(1);
      const futureTaskId = tasks[0].id;
      await schedule.destroy();
      const futureTaskAfter = await Task.findByPk(futureTaskId);
      expect(
        futureTaskAfter === null || futureTaskAfter.schedule_id === null,
      ).toBe(true);
    });
  });

  describe("task lifecycle from schedule updates", () => {
    const monday2030 = new Date("2030-06-02T00:00:00Z");
    const start9 = new Date("2030-06-02T09:00:00Z");
    const end17 = new Date("2030-06-02T17:00:00Z");

    it("should create multiple tasks when is_recurring true and recurrence_pattern weekly", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        name: "Weekly",
        scheduled_date: monday2030,
        start_time: start9,
        end_time: end17,
        is_recurring: true,
        recurrence_pattern: "weekly",
      });
      const tasks = await Task.findAll({
        where: { schedule_id: schedule.id },
        order: [["scheduled_date", "ASC"]],
      });
      expect(tasks.length).toBeGreaterThanOrEqual(5);
      expect(tasks[0].schedule_id).toBe(schedule.id);
      expect(tasks[0].store_id).toBe(recyclery.id);
    });

    it("should delete future tasks when is_recurring changed from true to false", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "point",
        scheduled_date: monday2030,
        start_time: start9,
        end_time: end17,
        is_recurring: true,
        recurrence_pattern: "daily",
      });
      let tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBeGreaterThan(0);
      await schedule.update({ is_recurring: false });
      tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(0);
    });

    it("should create future tasks when is_recurring changed from false to true", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "collection",
        scheduled_date: monday2030,
        start_time: start9,
        end_time: end17,
        is_recurring: false,
      });
      let tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(1);
      await schedule.update({
        is_recurring: true,
        recurrence_pattern: "weekly",
      });
      tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBeGreaterThanOrEqual(5);
    });

    it("should update future tasks in place when only other fields change", async () => {
      const recyclery = await createRecyclery();
      const schedule = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        name: "Original",
        scheduled_date: new Date("2030-07-15"),
        start_time: new Date("2030-07-15T08:00:00Z"),
        end_time: new Date("2030-07-15T16:00:00Z"),
        is_recurring: false,
      });
      const countBefore = (
        await Task.findAll({ where: { schedule_id: schedule.id } })
      ).length;
      await schedule.update({ name: "Updated Name", notes: "Updated notes" });
      const tasksAfter = await Task.findAll({
        where: { schedule_id: schedule.id },
      });
      expect(tasksAfter.length).toBe(countBefore);
      expect(tasksAfter[0].name).toBe("Updated Name");
    });
  });

  describe("store or collection point change", () => {
    it("should succeed and update future tasks when store_id is changed to another recyclery", async () => {
      const r1 = await createRecyclery({ name: "Store A" });
      const r2 = await createRecyclery({ name: "Store B" });
      const schedule = await TaskSchedule.create({
        store_id: r1.id,
        category: "vente",
        scheduled_date: new Date("2030-08-01"),
        start_time: new Date("2030-08-01T09:00:00Z"),
        end_time: new Date("2030-08-01T17:00:00Z"),
        is_recurring: false,
      });
      await schedule.update({ store_id: r2.id });
      const tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
      expect(tasks.length).toBe(1);
      expect(tasks[0].store_id).toBe(r2.id);
    });

    //   it("should succeed when collection_point_id is changed to another point", async () => {
    //     const recyclery = await createRecyclery();
    //     const cp1 = await createCollectionPoint(recyclery.id, { name: "CP A" });
    //     const cp2 = await createCollectionPoint(recyclery.id, { name: "CP B" });
    //     const schedule = await TaskSchedule.create({
    //       collection_point_id: cp1.id,
    //       category: "collection",
    //       scheduled_date: new Date("2030-09-01"),
    //       start_time: new Date("2030-09-01T09:00:00Z"),
    //       end_time: new Date("2030-09-01T12:00:00Z"),
    //       is_recurring: false,
    //     });
    //     await schedule.update({ collection_point_id: cp2.id });
    //     const tasks = await Task.findAll({ where: { schedule_id: schedule.id } });
    //     expect(tasks.length).toBe(1);
    //     expect(tasks[0].collection_point_id).toBe(cp2.id);
    //   });
  });

  describe("creation conflicts", () => {
    const sameDay = new Date("2030-10-07T00:00:00Z");
    const slot1Start = new Date("2030-10-07T09:00:00Z");
    const slot1End = new Date("2030-10-07T17:00:00Z");
    const slot2Start = new Date("2030-10-07T10:00:00Z");
    const slot2End = new Date("2030-10-07T18:00:00Z");
    const slotNonOverlapStart = new Date("2030-10-07T14:00:00Z");
    const slotNonOverlapEnd = new Date("2030-10-07T17:00:00Z");

    it("should throw when creating overlapping schedule same store and same day", async () => {
      const recyclery = await createRecyclery();
      await TaskSchedule.create({
        store_id: recyclery.id,
        category: "vente",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      await expect(
        TaskSchedule.create({
          store_id: recyclery.id,
          category: "vente",
          scheduled_date: sameDay,
          start_time: slot2Start,
          end_time: slot2End,
          is_recurring: false,
        }),
      ).rejects.toThrow(/Conflit|Conflict/i);
    });

    it("should succeed when same time but different recyclery", async () => {
      const r1 = await createRecyclery({ name: "R1" });
      const r2 = await createRecyclery({ name: "R2" });
      await TaskSchedule.create({
        store_id: r1.id,
        category: "vente",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      const s2 = await TaskSchedule.create({
        store_id: r2.id,
        category: "vente",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      expect(s2.id).toBeDefined();
    });

    it("should succeed when same time but different collection point", async () => {
      const recyclery = await createRecyclery();
      const cp1 = await createCollectionPoint(recyclery.id, { name: "CP1" });
      const cp2 = await createCollectionPoint(recyclery.id, { name: "CP2" });
      await TaskSchedule.create({
        collection_point_id: cp1.id,
        category: "collection",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      const s2 = await TaskSchedule.create({
        collection_point_id: cp2.id,
        category: "collection",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      expect(s2.id).toBeDefined();
    });

    it("should succeed when same store and day but non-overlapping time", async () => {
      const recyclery = await createRecyclery();
      await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: new Date("2030-10-07T12:00:00Z"),
        is_recurring: false,
      });
      const s2 = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "custom",
        scheduled_date: sameDay,
        start_time: slotNonOverlapStart,
        end_time: slotNonOverlapEnd,
        is_recurring: false,
      });
      expect(s2.id).toBeDefined();
    });

    it("should succeed when same store and category but different day", async () => {
      const recyclery = await createRecyclery();
      const otherDay = new Date("2030-10-08T00:00:00Z");
      await TaskSchedule.create({
        store_id: recyclery.id,
        category: "point",
        scheduled_date: sameDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      const s2 = await TaskSchedule.create({
        store_id: recyclery.id,
        category: "point",
        scheduled_date: otherDay,
        start_time: slot1Start,
        end_time: slot1End,
        is_recurring: false,
      });
      expect(s2.id).toBeDefined();
    });
  });
});
