import { beforeAll, afterAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  addUserToTask,
  createTimeRange,
  deleteTimeRange,
  getAvailableEmployeesForTask,
  updateTask,
  updateTimeRange,
} from "../../src/v1/controllers/tasks";
import { createEmployee } from "../models/helpers.js";
import { expectHttpError, makeReq, makeRes } from "./helpers.js";

const { Task, EmployeeWorkdays, EmployeeVacation, EmployeeTaskTimeRange } = db;

// Sunday 2030-06-02: day_of_week 0, "week1" under the app's bi-week split,
// and — under TZ=Europe/Paris summer time — 07:00Z/15:00Z read back as the
// local 09:00/17:00 used throughout these fixtures.
const SCHEDULED_DATE = new Date("2030-06-02");
const DAY_OF_WEEK = 0;
const WEEK = "week1";

// No store on purpose: keeps the Store filter in getAvailableEmployeesForTask
// out of the way for tests that don't care about it.
const createTask = async (overrides = {}) =>
  Task.create({
    name: "Tri",
    category: "custom",
    scheduled_date: SCHEDULED_DATE,
    start_time: new Date("2030-06-02T07:00:00Z"),
    end_time: new Date("2030-06-02T15:00:00Z"),
    ...overrides,
  });

const createWorkday = (employeeId, start_time, end_time, overrides = {}) =>
  EmployeeWorkdays.create({
    employee_id: employeeId,
    day_of_week: DAY_OF_WEEK,
    week: WEEK,
    is_working: true,
    start_time,
    end_time,
    ...overrides,
  });

const rangesFor = (taskId, employeeId) =>
  EmployeeTaskTimeRange.findAll({
    where: { TaskId: taskId, EmployeeId: employeeId },
    order: [["start_time", "ASC"]],
  });

const isAssigned = async (taskId, employeeId) => {
  const task = await Task.findByPk(taskId, { include: ["Employees"] });
  return task.Employees.some((e) => e.id === employeeId);
};

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("tasks controller: Time ranges", () => {
  it("creates the Assignment and its first range when a range is given", async () => {
    const task = await createTask();
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");

    const req = makeReq({
      params: { taskId: task.id },
      body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
    });
    const res = makeRes();

    await addUserToTask(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ start_time: "10:00", end_time: "11:00" }),
      }),
    );
    expect(await isAssigned(task.id, employee.id)).toBe(true);
  });

  it("picks the first free window when no range is given", async () => {
    const task = await createTask();
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");

    const req = makeReq({
      params: { taskId: task.id },
      body: { employee_id: employee.id },
    });
    const res = makeRes();

    await addUserToTask(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ start_time: "09:00", end_time: "17:00" }),
      }),
    );
  });

  it("rejects a range outside the Employee's Workday hours", async () => {
    const task = await createTask();
    const employee = await createEmployee();
    // Narrower than the Task's 09:00-17:00
    await createWorkday(employee.id, "09:00:00", "12:00:00");

    const req = makeReq({
      params: { taskId: task.id },
      body: { employee_id: employee.id, start_time: "13:00", end_time: "14:00" },
    });

    await expectHttpError(() => addUserToTask(req, makeRes()), 409);
  });

  it("rejects a range overlapping another Task's range for the same Employee that day", async () => {
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");
    const taskA = await createTask();
    const taskB = await createTask();

    await addUserToTask(
      makeReq({
        params: { taskId: taskA.id },
        body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
      }),
      makeRes(),
    );

    const req = makeReq({
      params: { taskId: taskB.id },
      body: { employee_id: employee.id, start_time: "10:30", end_time: "11:30" },
    });

    await expectHttpError(() => addUserToTask(req, makeRes()), 409);
  });

  it("allows a range that only touches another one (no gap, no overlap)", async () => {
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");
    const task = await createTask();

    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
      }),
      makeRes(),
    );

    const res = makeRes();
    await createTimeRange(
      makeReq({
        params: { taskId: task.id, employeeId: employee.id },
        body: { start_time: "11:00", end_time: "12:00" },
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ start_time: "11:00", end_time: "12:00" }),
      }),
    );
    expect(await rangesFor(task.id, employee.id)).toHaveLength(2);
  });

  it("keeps an existing range untouched when Workday hours shrink, but rejects the next edit", async () => {
    const employee = await createEmployee();
    const workday = await createWorkday(employee.id, "09:00:00", "17:00:00");
    const task = await createTask();

    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
      }),
      makeRes(),
    );
    const [range] = await rangesFor(task.id, employee.id);

    // Workday shrinks to 09:00-10:30 — the existing 10:00-11:00 range is left alone.
    await workday.update({ start_time: "09:00:00", end_time: "10:30:00" });
    const [stillThere] = await rangesFor(task.id, employee.id);
    expect([stillThere.start_time, stillThere.end_time]).toEqual(["10:00", "11:00"]);

    const req = makeReq({
      params: { taskId: task.id, employeeId: employee.id, rangeId: range.id },
      body: { start_time: "10:00", end_time: "11:00" },
    });
    await expectHttpError(() => updateTimeRange(req, makeRes()), 409);
  });

  it("does not touch an existing Assignment when a Vacation is added later", async () => {
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");
    const task = await createTask();

    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
      }),
      makeRes(),
    );

    await EmployeeVacation.create({
      employee_id: employee.id,
      reason: "paid_vacation",
      start_date: new Date("2030-06-01"),
      end_date: new Date("2030-06-03"),
    });

    expect(await isAssigned(task.id, employee.id)).toBe(true);
    const [range] = await rangesFor(task.id, employee.id);
    expect([range.start_time, range.end_time]).toEqual(["10:00", "11:00"]);
  });

  it("removes the Assignment when its last range is deleted", async () => {
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "17:00:00");
    const task = await createTask();

    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: employee.id, start_time: "10:00", end_time: "11:00" },
      }),
      makeRes(),
    );
    const [range] = await rangesFor(task.id, employee.id);

    await deleteTimeRange(
      makeReq({ params: { taskId: task.id, employeeId: employee.id, rangeId: range.id } }),
      makeRes(),
    );

    expect(await isAssigned(task.id, employee.id)).toBe(false);
    expect(await rangesFor(task.id, employee.id)).toHaveLength(0);
  });

  it("clamps ranges into a Task's new hours and drops an Assignment left with none", async () => {
    const task = await createTask(); // 09:00-17:00
    const dropped = await createEmployee();
    const clamped = await createEmployee();
    await createWorkday(dropped.id, "09:00:00", "17:00:00");
    await createWorkday(clamped.id, "09:00:00", "17:00:00");

    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: dropped.id, start_time: "15:00", end_time: "16:00" },
      }),
      makeRes(),
    );
    await addUserToTask(
      makeReq({
        params: { taskId: task.id },
        body: { employee_id: clamped.id, start_time: "13:00", end_time: "16:00" },
      }),
      makeRes(),
    );

    // Task now ends at 14:00 local (12:00Z): the "dropped" range falls entirely
    // outside it, the "clamped" one only partially.
    await updateTask(
      makeReq({
        params: { id: task.id },
        body: {
          name: task.name,
          category: task.category,
          priority: "medium",
          scheduled_date: task.scheduled_date,
          start_time: new Date("2030-06-02T07:00:00Z"),
          end_time: new Date("2030-06-02T12:00:00Z"),
        },
      }),
      makeRes(),
    );

    expect(await isAssigned(task.id, dropped.id)).toBe(false);
    expect(await rangesFor(task.id, dropped.id)).toHaveLength(0);

    expect(await isAssigned(task.id, clamped.id)).toBe(true);
    const [clampedRange] = await rangesFor(task.id, clamped.id);
    expect([clampedRange.start_time, clampedRange.end_time]).toEqual([
      "13:00",
      "14:00",
    ]);
  });

  it("returns workWindows (morning + afternoon) and busyRanges from other Tasks", async () => {
    const employee = await createEmployee();
    await createWorkday(employee.id, "09:00:00", "12:00:00");
    await createWorkday(employee.id, "14:00:00", "18:00:00");

    const otherTask = await createTask();
    await addUserToTask(
      makeReq({
        params: { taskId: otherTask.id },
        body: { employee_id: employee.id, start_time: "09:00", end_time: "10:00" },
      }),
      makeRes(),
    );

    const task = await createTask();
    const res = makeRes();
    await getAvailableEmployeesForTask(makeReq({ params: { taskId: task.id } }), res);

    const [{ data }] = res.json.mock.calls[0];
    const entry = data.find((e) => e.id === employee.id);

    expect(entry.workWindows).toEqual([
      { start_time: "09:00", end_time: "12:00" },
      { start_time: "14:00", end_time: "18:00" },
    ]);
    expect(entry.busyRanges).toHaveLength(1);
    expect(entry.busyRanges[0]).toEqual(
      expect.objectContaining({ start_time: "09:00", end_time: "10:00", task_id: otherTask.id }),
    );
  });
});
