import db from "../../src/models/index";

const { Category } = db;

describe("Category Model", () => {
  describe("CRUD", () => {
    it("should create a category", async () => {
      const cat = await Category.create({
        name: "Electronics",
        description: "Electronic items",
        defaultWeight: 1,
        defaultPrice: 5.5,
        IO: 1,
      });
      expect(cat.id).toBeDefined();
      expect(cat.name).toBe("Electronics");
      expect(cat.description).toBe("Electronic items");
      expect(cat.defaultWeight).toBe(1);
      expect(Number(cat.defaultPrice)).toBe(5.5);
      expect(cat.IO).toBe(1);
    });

    it("should read a category by primary key", async () => {
      const created = await Category.create({
        name: "ReadTest",
        IO: 0,
      });
      const found = await Category.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
      expect(found.id).toBe(created.id);
    });

    it("should update a category", async () => {
      const created = await Category.create({
        name: "BeforeUpdate",
        IO: 0,
      });
      await created.update({
        name: "AfterUpdate",
        description: "Updated desc",
      });
      const reloaded = await Category.findByPk(created.id);
      expect(reloaded.name).toBe("AfterUpdate");
      expect(reloaded.description).toBe("Updated desc");
    });

    it("should delete a category", async () => {
      const created = await Category.create({
        name: "ToDelete",
        IO: 0,
      });
      const id = created.id;
      await created.destroy();
      const found = await Category.findByPk(id);
      expect(found).toBeNull();
    });
  });

  describe("cascade delete subcategories", () => {
    it("should delete child categories when parent is deleted", async () => {
      const parent = await Category.create({ name: "Parent", IO: 0 });
      const child1 = await Category.create({
        name: "Child1",
        parent_id: parent.id,
        IO: 0,
      });
      const child2 = await Category.create({
        name: "Child2",
        parent_id: parent.id,
        IO: 0,
      });
      await parent.destroy();
      const foundChild1 = await Category.findByPk(child1.id);
      const foundChild2 = await Category.findByPk(child2.id);
      expect(foundChild1).toBeNull();
      expect(foundChild2).toBeNull();
    });
  });
});
