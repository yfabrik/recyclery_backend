import { QueryTypes, Sequelize } from "sequelize";
import helper from "../../src/migration_helpers/employeeTaskTimeRange.cjs";

const {
  parisTimeOfDay,
  createEmployeeTaskTimeRangeTable,
  dropEmployeeTaskTimeRangeTable,
  backfillEmployeeTaskTimeRanges,
} = helper;

describe("parisTimeOfDay", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it.each([
    ["winter (CET, +1h)", "2026-01-28T08:00:38.926Z", "09:00:00"],
    ["summer (CEST, +2h)", "2026-07-01T08:00:00.000Z", "10:00:00"],
    ["just before spring forward", "2026-03-29T00:30:00.000Z", "01:30:00"],
    ["just after spring forward", "2026-03-29T01:30:00.000Z", "03:30:00"],
    ["late evening before autumn back", "2026-10-24T23:30:00.000Z", "01:30:00"],
    ["first pass of 02:30 in autumn", "2026-10-25T00:30:00.000Z", "02:30:00"],
    ["second pass of 02:30 in autumn", "2026-10-25T01:30:00.000Z", "02:30:00"],
    ["Paris midnight in summer", "2026-06-30T22:00:00.000Z", "00:00:00"],
  ])("%s", (_label, iso, expected) => {
    expect(parisTimeOfDay(new Date(iso))).toBe(expected);
  });

  it("does not depend on the TZ of the process", () => {
    for (const tz of ["UTC", "America/New_York", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      expect(parisTimeOfDay(new Date("2026-07-01T08:15:59.000Z"))).toBe(
        "10:15:00",
      );
    }
  });

  it("reads the datetime formats found in SQLite and MariaDB", () => {
    expect(parisTimeOfDay("2026-01-28 08:00:38.926 +00:00")).toBe("09:00:00");
    expect(parisTimeOfDay("2026-07-01 08:00:00")).toBe("10:00:00");
    expect(parisTimeOfDay("2026-07-01T08:00:00.000Z")).toBe("10:00:00");
    expect(parisTimeOfDay(Date.UTC(2026, 6, 1, 8, 0, 0))).toBe("10:00:00");
  });

  it("rejects values that are not a datetime", () => {
    expect(() => parisTimeOfDay("nope")).toThrow(/datetime/i);
    expect(() => parisTimeOfDay(null)).toThrow(/datetime/i);
  });
});

describe("employee_task_time_range migration helpers (SQLite)", () => {
  let sequelize;
  let queryInterface;
  const rows = () =>
    sequelize.query(
      "SELECT EmployeeId, TaskId, start_time, end_time FROM employee_task_time_range ORDER BY EmployeeId, TaskId",
      { type: QueryTypes.SELECT },
    );

  const seedTask = (id, start, end) =>
    sequelize.query(
      "INSERT INTO Tasks (id, start_time, end_time) VALUES (?, ?, ?)",
      { replacements: [id, start, end] },
    );
  const assign = (employeeId, taskId) =>
    sequelize.query(
      "INSERT INTO employee_task (EmployeeId, TaskId, createdAt, updatedAt) VALUES (?, ?, '2026-01-01 00:00:00.000 +00:00', '2026-01-01 00:00:00.000 +00:00')",
      { replacements: [employeeId, taskId] },
    );

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
    });
    queryInterface = sequelize.getQueryInterface();
    await sequelize.query("CREATE TABLE Employees (id INTEGER PRIMARY KEY)");
    await sequelize.query(
      "CREATE TABLE Tasks (id INTEGER PRIMARY KEY, start_time DATETIME, end_time DATETIME)",
    );
    await sequelize.query(
      "CREATE TABLE employee_task (createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, EmployeeId INTEGER NOT NULL REFERENCES Employees (id) ON DELETE CASCADE, TaskId INTEGER NOT NULL REFERENCES Tasks (id) ON DELETE CASCADE, PRIMARY KEY (EmployeeId, TaskId))",
    );
    await sequelize.query("INSERT INTO Employees (id) VALUES (1), (2)");
  });

  afterEach(() => sequelize.close());

  it("refuses to run when employee_task is missing", async () => {
    await sequelize.query("DROP TABLE employee_task");
    await expect(
      createEmployeeTaskTimeRangeTable(queryInterface, Sequelize),
    ).rejects.toThrow(/employee_task/);
  });

  it("backfills each assignment with its Task's Paris time of day", async () => {
    // one winter, one summer, one across the spring DST change
    await seedTask(10, "2026-01-28 08:00:38.926 +00:00", "2026-01-28 11:00:38.926 +00:00");
    await seedTask(11, "2026-07-01 07:00:00.000 +00:00", "2026-07-01 10:30:00.000 +00:00");
    await seedTask(12, "2026-03-29 00:00:00.000 +00:00", "2026-03-29 03:00:00.000 +00:00");
    await assign(1, 10);
    await assign(2, 10);
    await assign(1, 11);
    await assign(2, 12);

    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);
    const inserted = await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize);

    expect(inserted).toBe(4);
    expect(await rows()).toEqual([
      { EmployeeId: 1, TaskId: 10, start_time: "09:00:00", end_time: "12:00:00" },
      { EmployeeId: 1, TaskId: 11, start_time: "09:00:00", end_time: "12:30:00" },
      { EmployeeId: 2, TaskId: 10, start_time: "09:00:00", end_time: "12:00:00" },
      { EmployeeId: 2, TaskId: 12, start_time: "01:00:00", end_time: "05:00:00" },
    ]);
  });

  it("is idempotent and leaves existing or edited ranges alone", async () => {
    await seedTask(10, "2026-01-28 08:00:00.000 +00:00", "2026-01-28 11:00:00.000 +00:00");
    await assign(1, 10);
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);

    expect(await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize)).toBe(1);
    await sequelize.query(
      "UPDATE employee_task_time_range SET start_time = '10:00:00', end_time = '11:00:00'",
    );
    await assign(2, 10);

    expect(await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize)).toBe(1);
    expect(await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize)).toBe(0);
    expect(await rows()).toEqual([
      { EmployeeId: 1, TaskId: 10, start_time: "10:00:00", end_time: "11:00:00" },
      { EmployeeId: 2, TaskId: 10, start_time: "09:00:00", end_time: "12:00:00" },
    ]);
  });

  it("does not backfill assignments whose Task is gone", async () => {
    await seedTask(10, "2026-01-28 08:00:00.000 +00:00", "2026-01-28 11:00:00.000 +00:00");
    await assign(1, 10);
    await sequelize.query("PRAGMA foreign_keys = OFF");
    await assign(1, 99);
    await sequelize.query("PRAGMA foreign_keys = ON");
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);

    expect(await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize)).toBe(1);
  });

  it("cascades range deletion when the assignment is removed", async () => {
    await seedTask(10, "2026-01-28 08:00:00.000 +00:00", "2026-01-28 11:00:00.000 +00:00");
    await assign(1, 10);
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);
    await backfillEmployeeTaskTimeRanges(queryInterface, Sequelize);

    await sequelize.query("DELETE FROM employee_task WHERE EmployeeId = 1");

    expect(await rows()).toEqual([]);
  });

  it("rejects a range that does not start before it ends", async () => {
    await seedTask(10, "2026-01-28 08:00:00.000 +00:00", "2026-01-28 11:00:00.000 +00:00");
    await assign(1, 10);
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);

    await expect(
      sequelize.query(
        "INSERT INTO employee_task_time_range (EmployeeId, TaskId, start_time, end_time, createdAt, updatedAt) VALUES (1, 10, '11:00:00', '10:00:00', '2026-01-01', '2026-01-01')",
      ),
    ).rejects.toThrow();
  });

  it("drops the table on down", async () => {
    await createEmployeeTaskTimeRangeTable(queryInterface, Sequelize);
    await dropEmployeeTaskTimeRangeTable(queryInterface);
    const tables = await queryInterface.showAllTables();
    expect(tables).not.toContain("employee_task_time_range");
  });
});
