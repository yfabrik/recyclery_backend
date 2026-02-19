import db from "../../src/models/index.js";
import { createRecyclery, createEmployee } from "./helpers.js";

const { EmployeeStore } = db;

describe("EmployeeStore Model", () => {
  describe("CRUD", () => {
    it("should create an employee-store link via Employee.addStore", async () => {
      const recyclery = await createRecyclery();
      const employee = await createEmployee();
      await employee.addStore(recyclery, { through: { is_primary: true } });
      const links = await EmployeeStore.findAll({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      expect(links.length).toBe(1);
      expect(links[0].is_primary).toBe(true);
    });

    it("should read employee-store link by composite key", async () => {
      const recyclery = await createRecyclery();
      const employee = await createEmployee();
      await employee.addStore(recyclery);
      const found = await EmployeeStore.findOne({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      expect(found).not.toBeNull();
      const empId = found.employeeId ?? found.employee_id ?? found.EmployeeId;
      const storeId =
        found.recycleryId ??
        found.recyclery_id ??
        found.RecycleryId ??
        found.store_id;
      expect(empId).toBe(employee.id);
      expect(storeId).toBe(recyclery.id);
    });

    it("should update is_primary on employee-store link", async () => {
      const recyclery = await createRecyclery();
      const employee = await createEmployee();
      await employee.addStore(recyclery, { through: { is_primary: true } });
      const link = await EmployeeStore.findOne({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      await link.update({ is_primary: false });
      const reloaded = await EmployeeStore.findOne({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      expect(reloaded).not.toBeNull();
      expect(Boolean(reloaded.is_primary)).toBe(false);
    });

    it("should delete an employee-store link", async () => {
      const recyclery = await createRecyclery();
      const employee = await createEmployee();
      await employee.addStore(recyclery);
      const link = await EmployeeStore.findOne({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      await link.destroy();
      const found = await EmployeeStore.findOne({
        where: { employeeId: employee.id, recycleryId: recyclery.id },
      });
      expect(found).toBeNull();
    });
  });
});
