import db from "../../src/models/index";
import { createEmployee, createRecyclery } from "./helpers.js";

const { Task, EmployeeTaskTimeRange } = db;

const createTask = async () => {
  const store = await createRecyclery();
  return Task.create({
    store_id: store.id,
    name: "Opening",
    category: "vente",
    scheduled_date: new Date("2030-06-02"),
    start_time: new Date("2030-06-02T07:00:00Z"),
    end_time: new Date("2030-06-02T15:00:00Z"),
  });
};

describe("EmployeeTaskTimeRange Model", () => {
  it("stores several time ranges for one assignment", async () => {
    const employee = await createEmployee();
    const task = await createTask();
    await task.addEmployee(employee);

    await EmployeeTaskTimeRange.bulkCreate([
      { EmployeeId: employee.id, TaskId: task.id, start_time: "09:00:00", end_time: "10:00:00" },
      { EmployeeId: employee.id, TaskId: task.id, start_time: "11:00:00", end_time: "12:00:00" },
    ]);

    const ranges = await EmployeeTaskTimeRange.findAll({
      where: { EmployeeId: employee.id, TaskId: task.id },
      order: [["start_time", "ASC"]],
    });
    expect(ranges.map((r) => [r.start_time, r.end_time])).toEqual([
      ["09:00:00", "10:00:00"],
      ["11:00:00", "12:00:00"],
    ]);
  });

  it("does not change what Task.Employees returns", async () => {
    const employee = await createEmployee();
    const task = await createTask();
    await task.addEmployee(employee);
    await EmployeeTaskTimeRange.bulkCreate([
      { EmployeeId: employee.id, TaskId: task.id, start_time: "09:00:00", end_time: "10:00:00" },
      { EmployeeId: employee.id, TaskId: task.id, start_time: "11:00:00", end_time: "12:00:00" },
    ]);

    const reloaded = await Task.findByPk(task.id, { include: ["Employees"] });

    expect(reloaded.Employees.map((e) => e.id)).toEqual([employee.id]);
  });

  it("loads its Employee and Task", async () => {
    const employee = await createEmployee();
    const task = await createTask();
    await task.addEmployee(employee);
    const range = await EmployeeTaskTimeRange.create({
      EmployeeId: employee.id,
      TaskId: task.id,
      start_time: "09:00:00",
      end_time: "10:00:00",
    });

    const found = await EmployeeTaskTimeRange.findByPk(range.id, {
      include: ["Employee", "Task"],
    });

    expect(found.Employee.id).toBe(employee.id);
    expect(found.Task.id).toBe(task.id);
  });
});
