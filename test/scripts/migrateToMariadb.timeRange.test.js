import { describe, expect, it } from "@jest/globals";
import {
  COPY_ORDER,
  normalizeRowValue,
} from "../../src/scripts/migrateToMariadb.helpers.js";

describe("migrateToMariadb: employee_task_time_range", () => {
  it("is copied right after employee_task, the table it references", () => {
    const parent = COPY_ORDER.indexOf("employee_task");
    expect(parent).toBeGreaterThanOrEqual(0);
    expect(COPY_ORDER[parent + 1]).toBe("employee_task_time_range");
  });

  describe("TIME values coming from SQLite as text", () => {
    const range = (start_time, end_time) => ({ start_time, end_time });
    const normalize = (row, col) =>
      normalizeRowValue(row, col, col, "employee_task_time_range");

    it("keeps HH:MM:SS as is", () => {
      const row = range("09:00:00", "12:30:00");
      expect(normalize(row, "start_time")).toBe("09:00:00");
      expect(normalize(row, "end_time")).toBe("12:30:00");
    });

    it("pads HH:MM to HH:MM:SS", () => {
      const row = range("09:00", "12:30");
      expect(normalize(row, "start_time")).toBe("09:00:00");
      expect(normalize(row, "end_time")).toBe("12:30:00");
    });

    it("does not touch the datetime start_time / end_time of other tables", () => {
      const row = {
        start_time: "2026-01-28 08:00:38.926 +00:00",
      };
      expect(normalizeRowValue(row, "start_time", "start_time", "Tasks")).toBe(
        "2026-01-28 08:00:38.926",
      );
    });
  });
});
