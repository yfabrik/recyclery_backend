import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { assignableWindows, minutesToTime, timeToMinutes } from "@recyclerie/api/domain/timeRange";
import db from "../../src/models/index";
import { errorHandler } from "../../src/middlewares/errorHandler";
import logger from "../../src/services/logger";
import { listEmployeeTasks } from "../../src/v1/controllers/employees";
import { getAvailableEmployeesForTask } from "../../src/v1/controllers/tasks";
import { createEmployee, createRecyclery } from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const { Task, EmployeeWorkdays, EmployeeVacation, EmployeeTaskTimeRange } = db;

// Sunday 2030-06-02 is day_of_week 0 and dayjs week 23 (odd) -> "week2" under the
// app's bi-week split; the following Sunday 2030-06-09 is week 24 -> "week1".
// June is summer time (UTC+2), so Paris 09:00 is 07:00Z.
const SUNDAY = "2030-06-02";
const MONDAY = "2030-06-03";

const parisSummer = (date, time) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours - 2, minutes));
};

const createTask = (overrides = {}) => {
  const { date = SUNDAY, from = "09:00", to = "17:00", ...rest } = overrides;
  return Task.create({
    name: `Tâche ${from}-${to}`,
    category: "custom",
    scheduled_date: new Date(date),
    start_time: parisSummer(date, from),
    end_time: parisSummer(date, to),
    ...rest,
  });
};

const createWorkday = (employeeId, start_time, end_time, overrides = {}) =>
  EmployeeWorkdays.create({
    employee_id: employeeId,
    day_of_week: 0,
    week: "week2",
    is_working: true,
    start_time,
    end_time,
    ...overrides,
  });

/** Writes an Assignment straight to the tables, bypassing the controllers' own rules. */
const assign = async (task, employee, ...ranges) => {
  await task.addEmployee(employee);
  for (const [start_time, end_time] of ranges) {
    await EmployeeTaskTimeRange.create({
      TaskId: task.id,
      EmployeeId: employee.id,
      start_time,
      end_time,
    });
  }
};

/** An Employee attached to a fresh Store, working 09:00-17:00 on Sundays (week2). */
const createStaffedEmployee = async () => {
  const store = await createRecyclery();
  const employee = await createEmployee();
  await employee.addStore(store);
  await createWorkday(employee.id, "09:00:00", "17:00:00");
  return { store, employee };
};

const call = async (employeeId, query) => {
  const res = makeRes();
  await listEmployeeTasks(makeReq({ params: { id: employeeId }, query }), res);
  return res.json.mock.calls[0][0];
};

const days = async (employeeId, query) => (await call(employeeId, query)).data.days;

const sundayRows = async (employeeId) =>
  (await days(employeeId, { date_from: SUNDAY, date_to: SUNDAY }))[0].rows;

/** The HTTP status the error middleware would answer for whatever `fn` throws. */
const statusOf = async (fn) => {
  let error;
  try {
    await fn();
  } catch (err) {
    error = err;
  }
  expect(error).toBeDefined();
  const res = makeRes();
  errorHandler(error, { headers: {}, body: {} }, res, () => {});
  return res.status.mock.calls[0][0];
};

const asWindows = (windows) =>
  windows.map(({ start, end }) => ({ start_time: minutesToTime(start), end_time: minutesToTime(end) }));

beforeAll(() => {
  // errorHandler logs every error it maps; keep the test output readable
  logger.silent = true;
});

beforeEach(async () => {
  await db.sequelize.sync({ force: true });
});

describe("employees controller: listEmployeeTasks", () => {
  describe("row status", () => {
    it("reports a Task the Employee holds as assigned, with all its Time ranges earliest first", async () => {
      const { store, employee } = await createStaffedEmployee();
      const task = await createTask({ store_id: store.id });
      await assign(task, employee, ["13:00", "14:00"], ["09:30", "10:30"]);

      const rows = await sundayRows(employee.id);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ task: { id: task.id }, status: "assigned" });
      expect(rows[0].timeRanges.map((r) => [r.start_time, r.end_time])).toEqual([
        ["09:30", "10:30"],
        ["13:00", "14:00"],
      ]);
      expect(rows[0].timeRanges.every((r) => r.employee_id === employee.id && r.task_id === task.id)).toBe(true);
      expect(rows[0].reason).toBeUndefined();
      expect(rows[0].blockedBy).toBeUndefined();
    });

    it("reports a free Task as assignable with the whole Workday overlap as its free window", async () => {
      const { store, employee } = await createStaffedEmployee();
      await createTask({ store_id: store.id, from: "10:00", to: "15:00" });

      const [row] = await sundayRows(employee.id);

      expect(row).toMatchObject({ status: "assignable", timeRanges: [] });
      expect(row.freeWindows).toEqual([{ start_time: "10:00", end_time: "15:00" }]);
    });

    it("reports partial free windows when Time ranges on another Task cut the Task", async () => {
      const { store, employee } = await createStaffedEmployee();
      const sorting = await createTask({ store_id: store.id, from: "09:00", to: "17:00" });
      const meeting = await createTask({ store_id: store.id, from: "11:00", to: "13:00" });
      await assign(meeting, employee, ["11:00", "13:00"]);

      const rows = await sundayRows(employee.id);
      const sortingRow = rows.find((row) => row.task.id === sorting.id);

      expect(sortingRow.status).toBe("assignable");
      expect(sortingRow.freeWindows).toEqual([
        { start_time: "09:00", end_time: "11:00" },
        { start_time: "13:00", end_time: "17:00" },
      ]);
    });

    it("does not subtract an assigned Task's own Time ranges from its free windows", async () => {
      const { store, employee } = await createStaffedEmployee();
      const task = await createTask({ store_id: store.id, from: "09:00", to: "17:00" });
      const other = await createTask({ store_id: store.id, from: "15:00", to: "16:00" });
      await assign(task, employee, ["09:00", "10:00"]);
      await assign(other, employee, ["15:00", "16:00"]);

      const rows = await sundayRows(employee.id);
      const taskRow = rows.find((row) => row.task.id === task.id);

      expect(taskRow.status).toBe("assigned");
      expect(taskRow.freeWindows).toEqual([
        { start_time: "09:00", end_time: "15:00" },
        { start_time: "16:00", end_time: "17:00" },
      ]);
    });

    it("reports outside-hours when no Workday hours overlap the Task", async () => {
      const store = await createRecyclery();
      const employee = await createEmployee();
      await employee.addStore(store);
      await createWorkday(employee.id, "09:00:00", "12:00:00");
      await createTask({ store_id: store.id, from: "14:00", to: "17:00" });

      const [row] = await sundayRows(employee.id);

      expect(row).toMatchObject({
        status: "unavailable",
        reason: "outside-hours",
        timeRanges: [],
        freeWindows: [],
      });
      expect(row.blockedBy).toBeUndefined();
    });

    it("reports outside-hours on a day the Employee does not work at all", async () => {
      const { store, employee } = await createStaffedEmployee();
      // Monday: no Workday row
      await createTask({ store_id: store.id, date: MONDAY });

      const [{ rows, workWindows }] = await days(employee.id, { date_from: MONDAY, date_to: MONDAY });

      expect(workWindows).toEqual([]);
      expect(rows[0]).toMatchObject({ status: "unavailable", reason: "outside-hours" });
    });

    it("reports busy and names the Task whose Time range blocks the Employee", async () => {
      const { store, employee } = await createStaffedEmployee();
      const blocker = await createTask({ store_id: store.id, name: "Collecte", from: "09:00", to: "17:00" });
      await assign(blocker, employee, ["09:00", "17:00"]);
      const blocked = await createTask({ store_id: store.id, name: "Tri", from: "10:00", to: "12:00" });

      const rows = await sundayRows(employee.id);
      const row = rows.find((r) => r.task.id === blocked.id);

      expect(row).toMatchObject({
        status: "unavailable",
        reason: "busy",
        timeRanges: [],
        freeWindows: [],
        blockedBy: { id: blocker.id, name: "Collecte" },
      });
    });

    it("blames the Task whose Time range blocks, not an earlier Task that merely overlaps in time", async () => {
      const { store, employee } = await createStaffedEmployee();
      // Created first, so a lookup by Task times alone would name it; its only range is in the afternoon
      const wide = await createTask({ store_id: store.id, name: "Journée", from: "09:00", to: "17:00" });
      await assign(wide, employee, ["13:00", "14:00"]);
      const blocker = await createTask({ store_id: store.id, name: "Livraison", from: "09:00", to: "12:00" });
      await assign(blocker, employee, ["09:00", "12:00"]);
      const target = await createTask({ store_id: store.id, name: "Rangement", from: "09:30", to: "11:00" });

      const rows = await sundayRows(employee.id);
      const row = rows.find((r) => r.task.id === target.id);

      expect(row).toMatchObject({ status: "unavailable", reason: "busy" });
      expect(row.blockedBy.id).toBe(blocker.id);
    });

    it("is not blocked by another Task's times, only by the Employee's Time ranges on it", async () => {
      const { store, employee } = await createStaffedEmployee();
      const wide = await createTask({ store_id: store.id, from: "09:00", to: "17:00" });
      await assign(wide, employee, ["09:00", "10:00"]);
      const narrow = await createTask({ store_id: store.id, from: "12:00", to: "13:00" });

      const rows = await sundayRows(employee.id);

      expect(rows.find((r) => r.task.id === narrow.id)).toMatchObject({ status: "assignable" });
    });

    it("keeps a Task assignable when only part of it is blocked", async () => {
      const { store, employee } = await createStaffedEmployee();
      const blocker = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });
      await assign(blocker, employee, ["09:00", "12:00"]);
      const partly = await createTask({ store_id: store.id, from: "10:00", to: "14:00" });

      const rows = await sundayRows(employee.id);
      const row = rows.find((r) => r.task.id === partly.id);

      expect(row.status).toBe("assignable");
      expect(row.freeWindows).toEqual([{ start_time: "12:00", end_time: "14:00" }]);
    });

    it("drops free fragments shorter than the minimum Time range, as the available-employees rules do", async () => {
      const { store, employee } = await createStaffedEmployee();
      const blocker = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });
      await assign(blocker, employee, ["09:00", "11:50"]);
      // Only 10 minutes (11:50-12:00) remain inside this Task
      const squeezed = await createTask({ store_id: store.id, from: "10:00", to: "12:00" });

      const rows = await sundayRows(employee.id);

      expect(rows.find((r) => r.task.id === squeezed.id)).toMatchObject({
        status: "unavailable",
        reason: "busy",
        freeWindows: [],
        blockedBy: { id: blocker.id },
      });
    });
  });

  describe("which Tasks are listed", () => {
    it("hides a Task of a Store the Employee is not attached to", async () => {
      const { employee } = await createStaffedEmployee();
      const otherStore = await createRecyclery();
      await createTask({ store_id: otherStore.id });

      expect(await sundayRows(employee.id)).toEqual([]);
    });

    it("shows a Task the Employee holds even in a Store they are no longer attached to", async () => {
      const { employee } = await createStaffedEmployee();
      const formerStore = await createRecyclery();
      const task = await createTask({ store_id: formerStore.id });
      await assign(task, employee, ["10:00", "11:00"]);

      const rows = await sundayRows(employee.id);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ task: { id: task.id }, status: "assigned" });
    });

    it("shows a Task with no Store, as the available-employees endpoint offers it to everyone", async () => {
      const { employee } = await createStaffedEmployee();
      const task = await createTask({ store_id: null });

      const rows = await sundayRows(employee.id);

      expect(rows.map((r) => r.task.id)).toEqual([task.id]);
    });

    it("ignores other Employees' assignments and Time ranges", async () => {
      const { store, employee } = await createStaffedEmployee();
      const colleague = await createEmployee();
      await colleague.addStore(store);
      await createWorkday(colleague.id, "09:00:00", "17:00:00");
      const task = await createTask({ store_id: store.id });
      await assign(task, colleague, ["09:00", "17:00"]);

      const [row] = await sundayRows(employee.id);

      expect(row).toMatchObject({ status: "assignable", timeRanges: [] });
      expect(row.freeWindows).toEqual([{ start_time: "09:00", end_time: "17:00" }]);
    });

    it("carries the Task's Store", async () => {
      const { store, employee } = await createStaffedEmployee();
      await createTask({ store_id: store.id });

      const [row] = await sundayRows(employee.id);

      expect(row.task.store_id).toBe(store.id);
      expect(row.task.Recyclery).toMatchObject({ id: store.id, name: store.name });
    });
  });

  describe("free windows agree with the available-employees endpoint", () => {
    it.each([
      ["an assignable Task", false],
      ["an assigned Task", true],
    ])("for %s", async (_label, held) => {
      const { store, employee } = await createStaffedEmployee();
      const morning = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });
      await assign(morning, employee, ["10:00", "11:00"]);
      const afternoon = await createTask({ store_id: store.id, from: "10:30", to: "16:00" });
      if (held) await assign(afternoon, employee, ["14:00", "15:00"]);

      const res = makeRes();
      await getAvailableEmployeesForTask(makeReq({ params: { taskId: afternoon.id } }), res);
      const candidate = res.json.mock.calls[0][0].data.find((e) => e.id === employee.id);
      const expected = asWindows(
        assignableWindows({
          task: { start: timeToMinutes("10:30"), end: timeToMinutes("16:00") },
          workWindows: candidate.workWindows.map((w) => ({
            start: timeToMinutes(w.start_time),
            end: timeToMinutes(w.end_time),
          })),
          otherRanges: candidate.busyRanges.map((r) => ({
            start: timeToMinutes(r.start_time),
            end: timeToMinutes(r.end_time),
          })),
        }),
      );

      const rows = await sundayRows(employee.id);
      const row = rows.find((r) => r.task.id === afternoon.id);

      expect(expected.length).toBeGreaterThan(0);
      expect(row.freeWindows).toEqual(expected);
    });
  });

  describe("dates", () => {
    it("lists one day when date_from equals date_to", async () => {
      const { store, employee } = await createStaffedEmployee();
      await createTask({ store_id: store.id });
      await createTask({ store_id: store.id, date: MONDAY });

      const result = await call(employee.id, { date_from: SUNDAY, date_to: SUNDAY });

      expect(result).toMatchObject({ success: true, data: { employee_id: employee.id } });
      expect(result.data.days.map((d) => d.date)).toEqual([SUNDAY]);
      expect(result.data.days[0].rows).toHaveLength(1);
    });

    it("lists every day of a range in order, empty days included, and orders rows by start time within a day", async () => {
      const { store, employee } = await createStaffedEmployee();
      const sundayLate = await createTask({ store_id: store.id, from: "14:00", to: "17:00" });
      const mondayEarly = await createTask({ store_id: store.id, date: MONDAY, from: "08:00", to: "10:00" });
      const sundayEarly = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });

      const result = await days(employee.id, { date_from: "2030-06-02", date_to: "2030-06-04" });

      expect(result.map((d) => d.date)).toEqual(["2030-06-02", "2030-06-03", "2030-06-04"]);
      expect(result[0].rows.map((r) => r.task.id)).toEqual([sundayEarly.id, sundayLate.id]);
      expect(result[1].rows.map((r) => r.task.id)).toEqual([mondayEarly.id]);
      expect(result[2].rows).toEqual([]);
    });

    it("breaks start-time ties by end time, then Task id", async () => {
      const { store, employee } = await createStaffedEmployee();
      const long = await createTask({ store_id: store.id, from: "09:00", to: "17:00" });
      const short = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });
      const twin = await createTask({ store_id: store.id, from: "09:00", to: "12:00" });

      const rows = await sundayRows(employee.id);

      expect(rows.map((r) => r.task.id)).toEqual([short.id, twin.id, long.id]);
    });

    it("includes both ends of the range", async () => {
      const { store, employee } = await createStaffedEmployee();
      const first = await createTask({ store_id: store.id, date: "2030-06-02" });
      const last = await createTask({ store_id: store.id, date: "2030-06-04" });
      await createTask({ store_id: store.id, date: "2030-06-05" });

      const result = await days(employee.id, { date_from: "2030-06-02", date_to: "2030-06-04" });

      expect(result.flatMap((d) => d.rows.map((r) => r.task.id))).toEqual([first.id, last.id]);
    });

    it("gives each day its own Workday hours (weekday and bi-week)", async () => {
      const { employee } = await createStaffedEmployee();
      await createWorkday(employee.id, "08:00:00", "10:00:00", { week: "week1" });
      await createWorkday(employee.id, "14:00:00", "16:00:00", { day_of_week: 1, week: "week2" });

      const result = await days(employee.id, { date_from: "2030-06-02", date_to: "2030-06-09" });

      const hoursOf = (date) => result.find((d) => d.date === date).workWindows;
      expect(hoursOf("2030-06-02")).toEqual([{ start_time: "09:00", end_time: "17:00" }]);
      expect(hoursOf("2030-06-03")).toEqual([{ start_time: "14:00", end_time: "16:00" }]);
      expect(hoursOf("2030-06-04")).toEqual([]);
      expect(hoursOf("2030-06-09")).toEqual([{ start_time: "08:00", end_time: "10:00" }]);
    });

    it("uses the Time ranges of the same day only when computing busy and free windows", async () => {
      const { store, employee } = await createStaffedEmployee();
      await createWorkday(employee.id, "09:00:00", "17:00:00", { day_of_week: 1 });
      const sunday = await createTask({ store_id: store.id });
      await assign(sunday, employee, ["09:00", "17:00"]);
      await createTask({ store_id: store.id, date: MONDAY });

      const [, monday] = await days(employee.id, { date_from: SUNDAY, date_to: MONDAY });

      expect(monday.rows[0]).toMatchObject({ status: "assignable" });
      expect(monday.rows[0].freeWindows).toEqual([{ start_time: "09:00", end_time: "17:00" }]);
    });

    it("reports a Vacation covering the day without turning anything unavailable yet", async () => {
      const { store, employee } = await createStaffedEmployee();
      const vacation = await EmployeeVacation.create({
        employee_id: employee.id,
        reason: "sick",
        start_date: new Date(SUNDAY),
        end_date: new Date(SUNDAY),
      });
      await createTask({ store_id: store.id });

      const [day, next] = await days(employee.id, { date_from: SUNDAY, date_to: MONDAY });

      expect(day.vacation).toMatchObject({ id: vacation.id, reason: "sick", start_date: SUNDAY, end_date: SUNDAY });
      expect(next.vacation).toBeNull();
      // Ticket 06 turns this into a "vacation" reason; for now the rules ignore Vacations.
      expect(day.rows[0].status).toBe("assignable");
    });

    it("answers 400 when a date is missing", async () => {
      const { employee } = await createStaffedEmployee();

      const status = (query) => statusOf(() => listEmployeeTasks(makeReq({ params: { id: employee.id }, query }), makeRes()));

      expect(await status({ date_to: SUNDAY })).toBe(400);
      expect(await status({ date_from: SUNDAY })).toBe(400);
      expect(await status({})).toBe(400);
    });

    it("answers 400 for a malformed date or a range that ends before it starts", async () => {
      const { employee } = await createStaffedEmployee();

      const status = (query) => statusOf(() => listEmployeeTasks(makeReq({ params: { id: employee.id }, query }), makeRes()));

      expect(await status({ date_from: "2 juin", date_to: SUNDAY })).toBe(400);
      expect(await status({ date_from: MONDAY, date_to: SUNDAY })).toBe(400);
    });

    it("accepts 31 days and answers 400 beyond", async () => {
      const { employee } = await createStaffedEmployee();

      const ok = await days(employee.id, { date_from: "2030-06-01", date_to: "2030-07-01" });
      expect(ok).toHaveLength(31);

      const status = await statusOf(() =>
        listEmployeeTasks(
          makeReq({ params: { id: employee.id }, query: { date_from: "2030-06-01", date_to: "2030-07-02" } }),
          makeRes(),
        ),
      );
      expect(status).toBe(400);
    });

    it("answers 404 for an unknown Employee", async () => {
      const status = await statusOf(() =>
        listEmployeeTasks(
          makeReq({ params: { id: 987654 }, query: { date_from: SUNDAY, date_to: SUNDAY } }),
          makeRes(),
        ),
      );
      expect(status).toBe(404);
    });
  });
});
