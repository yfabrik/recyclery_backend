import db from "../../src/models/index";

const { Role } = db;

describe("Role Model", () => {
  describe("CRUD", () => {
    it("should create a role", async () => {
      const role = await Role.create({
        name: "admin",
        display_name: "Administrator",
        level: "10",
      });
      expect(role.id).toBeDefined();
      expect(role.name).toBe("admin");
      expect(role.display_name).toBe("Administrator");
      expect(role.level).toBe("10");
    });

    it("should read a role by primary key", async () => {
      const created = await Role.create({
        name: "reader",
        display_name: "Reader",
        level: "1",
      });
      const found = await Role.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("reader");
    });

    it("should update a role", async () => {
      const created = await Role.create({
        name: "editor",
        display_name: "Editor",
        level: "5",
      });
      await created.update({ display_name: "Content Editor" });
      const reloaded = await Role.findByPk(created.id);
      expect(reloaded.display_name).toBe("Content Editor");
    });

    it("should delete a role", async () => {
      const created = await Role.create({
        name: "temp",
        display_name: "Temporary",
        level: "0",
      });
      const id = created.id;
      await created.destroy();
      const found = await Role.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
