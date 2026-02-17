import db from "../../src/models/index.js";
import { createUser } from "./helpers.js";

const { Category, EcoOrganism, WasteDisposal } = db;

describe("WasteDisposal Model", () => {
  describe("CRUD", () => {
    it("should create a waste disposal", async () => {
      const category = await Category.create({ name: "Waste", IO: 0 });
      const organism = await EcoOrganism.create({
        name: `Eco_${Date.now()}`,
        is_active: true,
      });
      const user = await createUser();
      const w = await WasteDisposal.create({
        category_id: category.id,
        eco_organism_id: organism.id,
        created_by: user.id,
        disposal_date: new Date(),
        disposal_type: "eco_organism",
        weight_kg: 50.5,
      });
      expect(w.id).toBeDefined();
      expect(Number(w.weight_kg)).toBe(50.5);
      expect(w.disposal_type).toBe("eco_organism");
    });

    it("should read a waste disposal by primary key", async () => {
      const category = await Category.create({ name: "W2", IO: 0 });
      const organism = await EcoOrganism.create({
        name: `Eco2_${Date.now()}`,
        is_active: true,
      });
      const user = await createUser();
      const created = await WasteDisposal.create({
        category_id: category.id,
        eco_organism_id: organism.id,
        created_by: user.id,
        disposal_date: new Date(),
        disposal_type: "recycling",
        weight_kg: 10,
      });
      const found = await WasteDisposal.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(Number(found.weight_kg)).toBe(10);
    });

    it("should update a waste disposal", async () => {
      const category = await Category.create({ name: "W3", IO: 0 });
      const organism = await EcoOrganism.create({
        name: `Eco3_${Date.now()}`,
        is_active: true,
      });
      const user = await createUser();
      const created = await WasteDisposal.create({
        category_id: category.id,
        eco_organism_id: organism.id,
        created_by: user.id,
        disposal_date: new Date(),
        disposal_type: "landfill",
        weight_kg: 20,
      });
      await created.update({ notes: "Updated notes" });
      const reloaded = await WasteDisposal.findByPk(created.id);
      expect(reloaded.notes).toBe("Updated notes");
    });

    it("should delete a waste disposal", async () => {
      const category = await Category.create({ name: "W4", IO: 0 });
      const organism = await EcoOrganism.create({
        name: `Eco4_${Date.now()}`,
        is_active: true,
      });
      const user = await createUser();
      const created = await WasteDisposal.create({
        category_id: category.id,
        eco_organism_id: organism.id,
        created_by: user.id,
        disposal_date: new Date(),
        disposal_type: "other",
        weight_kg: 5,
      });
      const id = created.id;
      await created.destroy();
      const found = await WasteDisposal.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
