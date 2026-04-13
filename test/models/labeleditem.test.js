import db from "../../src/models/index";
import { createRecyclery, createUser } from "./helpers.js";

const { Category, LabeledItem } = db;

describe("LabeledItem Model", () => {
  describe("CRUD", () => {
    it("should create a labeled item", async () => {
      const category = await Category.create({ name: "Items", IO: 0 });
      const recyclery = await createRecyclery();
      const user = await createUser();
      const item = await LabeledItem.create({
        category_id: category.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 5.99,
        description: "Test item",
      });
      expect(item.id).toBeDefined();
      expect(Number(item.price)).toBe(5.99);
      expect(item.status).toBe("available");
    });

    it("should read a labeled item by primary key", async () => {
      const category = await Category.create({ name: "Items2", IO: 0 });
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await LabeledItem.create({
        category_id: category.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 10,
      });
      const found = await LabeledItem.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(Number(found.price)).toBe(10);
    });

    it("should update a labeled item", async () => {
      const category = await Category.create({ name: "Items3", IO: 0 });
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await LabeledItem.create({
        category_id: category.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 7,
      });
      await created.update({ status: "sold", description: "Updated" });
      const reloaded = await LabeledItem.findByPk(created.id);
      expect(reloaded.status).toBe("sold");
      expect(reloaded.description).toBe("Updated");
    });

    it("should delete a labeled item", async () => {
      const category = await Category.create({ name: "Items4", IO: 0 });
      const recyclery = await createRecyclery();
      const user = await createUser();
      const created = await LabeledItem.create({
        category_id: category.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 3,
      });
      const id = created.id;
      await created.destroy();
      const found = await LabeledItem.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
