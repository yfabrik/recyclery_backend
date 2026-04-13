import db from "../../src/models/index";

const { TaskTemplate } = db;

describe("TaskTemplate Model", () => {
  describe("CRUD", () => {
    it("should create a task template", async () => {
      const t = await TaskTemplate.create({
        name: "Opening",
        description: "Store opening",
        category: "vente",
        priority: "high",
      });
      expect(t.id).toBeDefined();
      expect(t.name).toBe("Opening");
      expect(t.category).toBe("vente");
    });

    it("should read a task template by primary key", async () => {
      const created = await TaskTemplate.create({
        name: "ReadTest",
        category: "collection",
      });
      const found = await TaskTemplate.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a task template", async () => {
      const created = await TaskTemplate.create({
        name: "Before",
        category: "point",
      });
      await created.update({ name: "After", priority: "medium" });
      const reloaded = await TaskTemplate.findByPk(created.id);
      expect(reloaded.name).toBe("After");
      expect(reloaded.priority).toBe("medium");
    });

    it("should delete a task template", async () => {
      const created = await TaskTemplate.create({
        name: "ToDelete",
        category: "custom",
      });
      const id = created.id;
      await created.destroy();
      const found = await TaskTemplate.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
