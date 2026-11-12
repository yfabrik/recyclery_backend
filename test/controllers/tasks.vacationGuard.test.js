import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  addUserToTask,
  createTimeRange,
  deleteTimeRange,
  updateTimeRange,
} from "../../src/v1/controllers/tasks";
import { createEmployee } from "../models/helpers.js";
import { expectHttpError, makeReq, makeRes } from "./helpers.js";

const { Task, EmployeeWorkdays, EmployeeVacation, EmployeeTaskTimeRange } = db;

// Sunday 2030-06-02: day_of_week 0, dayjs week 23 (odd) -> "week2" under the
// app's bi-week split. June is summer time (UTC+2), so the Task below reads
// back as 09:00-17:00 in Paris. Vacations are stored the way the vacation
// controller does: UTC midnight of the calendar date.
const TASK_DAY = "2030-06-02";

const createTask = () =>
  Task.create({
    name: "Tri",
    category: "custom",
    scheduled_date: new Date(TASK_DAY),
    start_time: new Date("2030-06-02T07:00:00Z"),
    end_time: new Date("2030-06-02T15:00:00Z"),
  });

const createWorkingEmployee = async () => {
  const employee = await createEmployee();
  await EmployeeWorkdays.create({
    employee_id: employee.id,
    day_of_week: 0,
    week: "week2",
    is_working: true,
    start_time: "09:00:00",
    end_time: "17:00:00",
  });
  return employee;
};

const createVacation = (employee, start, end) =>
  EmployeeVacation.create({
    employee_id: employee.id,
    reason: "paid_vacation",
    start_date: new Date(start),
    end_date: new Date(end),
  });

const assign = (task, employee, range) =>
  addUserToTask(
    makeReq({ params: { taskId: task.id }, body: { employee_id: employee.id, ...range } }),
    makeRes(),
  );

const addRange = (task, employee, start_time, end_time) =>
  createTimeRange(
    makeReq({ params: { taskId: task.id, employeeId: employee.id }, body: { start_time, end_time } }),
    makeRes(),
  );

const rangesFor = (task, employee) =>
  EmployeeTaskTimeRange.findAll({
    where: { TaskId: task.id, EmployeeId: employee.id },
    order: [["start_time", "ASC"]],
  });

const isAssigned = async (task, employee) => {
  const reloaded = await Task.findByPk(task.id, { include: ["Employees"] });
  return reloaded.Employees.some((e) => e.id === employee.id);
};

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

describe("tasks controller: Vacation guard", () => {
  describe("assigning an Employee (POST /tasks/:id/employees)", () => {
    it("answers 409 for an Employee on Vacation that day and creates nothing", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, "2030-06-01", "2030-06-03");

      await expectHttpError(() => assign(task, employee, { start_time: "10:00", end_time: "11:00" }), 409);
      await expectHttpError(() => assign(task, employee), 409);

      expect(await isAssigned(task, employee)).toBe(false);
      expect(await rangesFor(task, employee)).toHaveLength(0);
    });

    it("says the Employee is on Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, TASK_DAY, TASK_DAY);

      await expect(assign(task, employee)).rejects.toMatchObject({
        message: expect.stringContaining("congé"),
      });
    });

    it("counts the first day of the Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, TASK_DAY, "2030-06-10");

      await expectHttpError(() => assign(task, employee), 409);
    });

    it("counts the last day of the Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, "2030-05-20", TASK_DAY);

      await expectHttpError(() => assign(task, employee), 409);
    });

    it("allows the day after the Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, "2030-05-20", "2030-06-01");

      await assign(task, employee);

      expect(await isAssigned(task, employee)).toBe(true);
    });

    it("allows the day before the Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(employee, "2030-06-03", "2030-06-10");

      await assign(task, employee);

      expect(await isAssigned(task, employee)).toBe(true);
    });

    it("ignores the Vacation of another Employee", async () => {
      const onVacation = await createWorkingEmployee();
      const other = await createWorkingEmployee();
      const task = await createTask();
      await createVacation(onVacation, TASK_DAY, TASK_DAY);

      await assign(task, other);

      expect(await isAssigned(task, other)).toBe(true);
    });
  });

  describe("creating a Time range (POST /tasks/:id/employees/:employeeId/time-ranges)", () => {
    it("answers 409 for an Employee on Vacation that day and creates nothing", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await assign(task, employee, { start_time: "10:00", end_time: "11:00" });
      await createVacation(employee, "2030-06-01", "2030-06-03");

      await expectHttpError(() => addRange(task, employee, "13:00", "14:00"), 409);

      expect(await rangesFor(task, employee)).toHaveLength(1);
    });

    it("counts the first and the last day of the Vacation", async () => {
      const first = await createWorkingEmployee();
      const last = await createWorkingEmployee();
      const task = await createTask();
      await assign(task, first, { start_time: "10:00", end_time: "11:00" });
      await assign(task, last, { start_time: "10:00", end_time: "11:00" });
      await createVacation(first, TASK_DAY, "2030-06-10");
      await createVacation(last, "2030-05-20", TASK_DAY);

      await expectHttpError(() => addRange(task, first, "13:00", "14:00"), 409);
      await expectHttpError(() => addRange(task, last, "13:00", "14:00"), 409);
    });

    it("allows the day after the Vacation", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await assign(task, employee, { start_time: "10:00", end_time: "11:00" });
      await createVacation(employee, "2030-05-20", "2030-06-01");

      await addRange(task, employee, "13:00", "14:00");

      expect(await rangesFor(task, employee)).toHaveLength(2);
    });
  });

  describe("clearing a Vacation conflict", () => {
    it("still updates an existing Time range on a Vacation day", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await assign(task, employee, { start_time: "10:00", end_time: "11:00" });
      await createVacation(employee, TASK_DAY, TASK_DAY);
      const [range] = await rangesFor(task, employee);

      await updateTimeRange(
        makeReq({
          params: { taskId: task.id, employeeId: employee.id, rangeId: range.id },
          body: { start_time: "10:00", end_time: "12:00" },
        }),
        makeRes(),
      );

      const [updated] = await rangesFor(task, employee);
      expect([updated.start_time, updated.end_time]).toEqual(["10:00", "12:00"]);
    });

    it("still deletes an existing Time range on a Vacation day, and the Assignment with the last one", async () => {
      const employee = await createWorkingEmployee();
      const task = await createTask();
      await assign(task, employee, { start_time: "10:00", end_time: "11:00" });
      await createVacation(employee, TASK_DAY, TASK_DAY);
      const [range] = await rangesFor(task, employee);

      await deleteTimeRange(
        makeReq({ params: { taskId: task.id, employeeId: employee.id, rangeId: range.id } }),
        makeRes(),
      );

      expect(await rangesFor(task, employee)).toHaveLength(0);
      expect(await isAssigned(task, employee)).toBe(false);
    });
  });
});
