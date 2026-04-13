import db from "../../src/models/index";
import { createRecyclery, createUser } from "./helpers.js";
import { createCollectionPoint } from "./helpers.js";

const { Category, Arrival } = db;

describe("Arrival Model", () => {
  describe("CRUD", () => {
    it("should create an arrival", async () => {
      const category = await Category.create({ name: "Cat", IO: 0 });
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id);
      const user = await createUser();
      const a = await Arrival.create({
        category_id: category.id,
        collection_point_id: cp.id,
        processed_by: user.id,
        weight: 10.5,
        source_type: "point",
      });
      expect(a.id).toBeDefined();
      expect(Number(a.weight)).toBe(10.5);
      expect(a.source_type).toBe("point");
      expect(a.status).toBe("received");
    });

    it("should read an arrival by primary key", async () => {
      const category = await Category.create({ name: "Cat2", IO: 0 });
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id);
      const user = await createUser();
      const created = await Arrival.create({
        category_id: category.id,
        collection_point_id: cp.id,
        processed_by: user.id,
        weight: 5,
        source_type: "apport",
      });
      const found = await Arrival.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(Number(found.weight)).toBe(5);
    });

    it("should update an arrival", async () => {
      const category = await Category.create({ name: "Cat3", IO: 0 });
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id);
      const user = await createUser();
      const created = await Arrival.create({
        category_id: category.id,
        collection_point_id: cp.id,
        processed_by: user.id,
        weight: 3,
        source_type: "point",
      });
      await created.update({ notes: "Updated notes" });
      const reloaded = await Arrival.findByPk(created.id);
      expect(reloaded.notes).toBe("Updated notes");
    });

    it("should delete an arrival", async () => {
      const category = await Category.create({ name: "Cat4", IO: 0 });
      const recyclery = await createRecyclery();
      const cp = await createCollectionPoint(recyclery.id);
      const user = await createUser();
      const created = await Arrival.create({
        category_id: category.id,
        collection_point_id: cp.id,
        processed_by: user.id,
        weight: 1,
        source_type: "house_clearance",
      });
      const id = created.id;
      await created.destroy();
      const found = await Arrival.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
