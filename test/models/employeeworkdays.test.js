import db from "../../src/models/index.js";
import { createEmployee } from "./helpers.js";

const { EmployeeWorkdays } = db;

describe("EmployeeWorkdays Model", () => {
  describe("CRUD", () => {
    it("should create an employee workday", async () => {
      const employee = await createEmployee();
      const w = await EmployeeWorkdays.create({
        employee_id: employee.id,
        day_of_week: "monday",
        is_working: true,
        start_time: "09:00",
        end_time: "17:00",
      });
      expect(w.id).toBeDefined();
      expect(w.day_of_week).toBe("monday");
      expect(w.is_working).toBe(true);
    });

    it("should read an employee workday by primary key", async () => {
      const employee = await createEmployee();
      const created = await EmployeeWorkdays.create({
        employee_id: employee.id,
        day_of_week: "tuesday",
        is_working: false,
      });
      const found = await EmployeeWorkdays.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.day_of_week).toBe("tuesday");
    });

    it("should update an employee workday", async () => {
      const employee = await createEmployee();
      const created = await EmployeeWorkdays.create({
        employee_id: employee.id,
        day_of_week: "wednesday",
        is_working: true,
      });
      await created.update({ is_working: false, notes: "Updated" });
      const reloaded = await EmployeeWorkdays.findByPk(created.id);
      expect(reloaded.is_working).toBe(false);
      expect(reloaded.notes).toBe("Updated");
    });

    it("should delete an employee workday", async () => {
      const employee = await createEmployee();
      const created = await EmployeeWorkdays.create({
        employee_id: employee.id,
        day_of_week: "thursday",
      });
      const id = created.id;
      await created.destroy();
      const found = await EmployeeWorkdays.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
