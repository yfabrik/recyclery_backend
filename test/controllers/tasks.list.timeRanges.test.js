import { beforeAll, describe, expect, it } from "@jest/globals";
import db from "../../src/models/index";
import {
  addUserToTask,
  createTimeRange,
  listTasks,
} from "../../src/v1/controllers/tasks";
import { createEmployee } from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const { Task, EmployeeWorkdays } = db;

// Sunday 2030-06-02, same fixtures as tasks.timeRanges.test.js.
const SCHEDULED_DATE = new Date("2030-06-02");

const createTask = async (overrides = {}) =>
  Task.create({
    name: "Tri",
    category: "custom",
    scheduled_date: SCHEDULED_DATE,
    start_time: new Date("2030-06-02T07:00:00Z"),
    end_time: new Date("2030-06-02T15:00:00Z"),
    ...overrides,
  });

const createEmployeeWithFullDay = async () => {
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

const assign = (taskId, employeeId, start_time, end_time) =>
  addUserToTask(
    makeReq({ params: { taskId }, body: { employee_id: employeeId, start_time, end_time } }),
    makeRes(),
  );

const list = async (include) => {
  const res = makeRes();
  await listTasks(makeReq({ query: include === undefined ? {} : { include } }), res);
  return res.json.mock.calls[0][0].data;
};

const byId = (tasks, id) => tasks.find((t) => t.id === id);

let taskA;
let taskB;
let emptyTask;
let employee1;
let employee2;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  employee1 = await createEmployeeWithFullDay();
  employee2 = await createEmployeeWithFullDay();
  taskA = await createTask({ name: "A" });
  taskB = await createTask({ name: "B" });
  emptyTask = await createTask({ name: "Vide" });

  // employee1: two ranges on A, one on B; employee2: one range on A.
  await assign(taskA.id, employee1.id, "09:00", "10:00");
  await createTimeRange(
    makeReq({
      params: { taskId: taskA.id, employeeId: employee1.id },
      body: { start_time: "14:00", end_time: "15:00" },
    }),
    makeRes(),
  );
  await assign(taskB.id, employee1.id, "11:00", "12:00");
  await assign(taskA.id, employee2.id, "09:00", "12:00");
});

const rangeSummaries = (task) =>
  task.timeRanges
    .map((r) => [r.employee_id, r.task_id, r.start_time, r.end_time])
    .sort();

describe("listTasks: include=timeRanges", () => {
  it("omits the timeRanges key without the include", async () => {
    const tasks = await list();

    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const task of tasks) expect(task).not.toHaveProperty("timeRanges");
  });

  it("lists on each Task only its own ranges, several per Employee included", async () => {
    const tasks = await list("timeRanges");

    expect(rangeSummaries(byId(tasks, taskA.id))).toEqual([
      [employee1.id, taskA.id, "09:00", "10:00"],
      [employee1.id, taskA.id, "14:00", "15:00"],
      [employee2.id, taskA.id, "09:00", "12:00"],
    ]);
    expect(rangeSummaries(byId(tasks, taskB.id))).toEqual([
      [employee1.id, taskB.id, "11:00", "12:00"],
    ]);
  });

  it("gives an empty array to a Task with no assignees", async () => {
    const tasks = await list("timeRanges");

    expect(byId(tasks, emptyTask.id).timeRanges).toEqual([]);
  });

  it("works together with the user include, which keeps Employees", async () => {
    const tasks = await list("user,timeRanges");
    const task = byId(tasks, taskA.id);

    expect(task.timeRanges).toHaveLength(3);
    expect(task.Employees.map((e) => e.id).sort()).toEqual(
      [employee1.id, employee2.id].sort(),
    );
  });

  it("does not add timeRanges when only another include is asked", async () => {
    const tasks = await list("user");

    expect(byId(tasks, taskA.id)).not.toHaveProperty("timeRanges");
  });

  it("still rejects an unknown include value", async () => {
    await expect(list("timeRanges,nope")).rejects.toThrow();
  });
});
