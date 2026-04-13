import db from "../../src/models/index";

const { EcoOrganism } = db;

describe("EcoOrganism Model", () => {
  describe("CRUD", () => {
    it("should create an eco organism", async () => {
      const name = `EcoOrg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const e = await EcoOrganism.create({
        name,
        description: "Recycling partner",
        is_active: true,
      });
      expect(e.id).toBeDefined();
      expect(e.name).toBe(name);
      expect(e.is_active).toBe(true);
    });

    it("should read an eco organism by primary key", async () => {
      const name = `Read_${Date.now()}`;
      const created = await EcoOrganism.create({ name });
      const found = await EcoOrganism.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe(name);
    });

    it("should update an eco organism", async () => {
      const name = `Upd_${Date.now()}`;
      const created = await EcoOrganism.create({ name });
      await created.update({ description: "Updated desc", is_active: false });
      const reloaded = await EcoOrganism.findByPk(created.id);
      expect(reloaded.description).toBe("Updated desc");
      expect(reloaded.is_active).toBe(false);
    });

    it("should delete an eco organism", async () => {
      const name = `Del_${Date.now()}`;
      const created = await EcoOrganism.create({ name });
      const id = created.id;
      await created.destroy();
      const found = await EcoOrganism.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
