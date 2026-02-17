import db from "../../src/models/index.js";
import { createEmployee } from "./helpers.js";

const { Employee } = db;

describe("Employee Model", () => {
  describe("CRUD", () => {
    it("should create an employee", async () => {
      const e = await createEmployee({
        nom: "Martin",
        prenom: "Marie",
        email: "marie.martin@test.com",
      });
      expect(e.id).toBeDefined();
      expect(e.nom).toBe("Martin");
      expect(e.prenom).toBe("Marie");
      expect(e.fullName).toBe("Martin Marie");
      expect(e.isActive).toBe(true);
    });

    it("should read an employee by primary key", async () => {
      const created = await createEmployee({ nom: "Read", prenom: "Test" });
      const found = await Employee.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.nom).toBe("Read");
    });

    it("should update an employee", async () => {
      const created = await createEmployee({ nom: "Before", prenom: "Update" });
      await created.update({ nom: "After", prenom: "Updated" });
      const reloaded = await Employee.findByPk(created.id);
      expect(reloaded.nom).toBe("After");
      expect(reloaded.prenom).toBe("Updated");
    });

    it("should delete an employee", async () => {
      const created = await createEmployee({ nom: "ToDelete", prenom: "X" });
      const id = created.id;
      await created.destroy();
      const found = await Employee.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
