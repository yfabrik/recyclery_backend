/**
 * Server-side Time range helpers shared by the tasks controller (validation on
 * write) and the Task/TaskSchedule models (clamping on a Task time edit).
 *
 * Models are taken as parameters rather than imported from `models/index.js`:
 * this module is also used from `models/taskschedule.ts`, which is itself
 * loaded by `models/index.js`, so importing the `db` singleton here would be
 * a circular import.
 */
import createHttpError from "http-errors";
import { Op, type ModelStatic, type Transaction } from "sequelize";
import {
  clipWindow,
  minutesToTime,
  timeToMinutes,
  validateTimeRange,
  TIME_RANGE_MIN_MINUTES,
  TIME_RANGE_VIOLATION_MESSAGES,
  type MinuteWindow,
  type TimeRangeContext,
} from "@recyclerie/api/domain/timeRange";
import { endOfDay, startOfDay, weekday } from "../utils/dates.js";
import type EmployeeTaskTimeRangeModel from "../models/employeetasktimerange.ts";
import type EmployeeWorkdaysModel from "../models/employeeworkdays.ts";
import type TaskModel from "../models/task.ts";

export interface TimeRangeModels {
  EmployeeWorkdays: ModelStatic<EmployeeWorkdaysModel>;
  EmployeeTaskTimeRange: ModelStatic<EmployeeTaskTimeRangeModel>;
  Task: ModelStatic<TaskModel>;
}

export const dateToMinutes = (value: Date): number =>
  value.getHours() * 60 + value.getMinutes();

/** A Task's time of day, in minutes since midnight. */
export const taskWindow = (task: {
  start_time: Date;
  end_time: Date;
}): MinuteWindow => ({
  start: dateToMinutes(task.start_time),
  end: dateToMinutes(task.end_time),
});

/**
 * Same bi-weekly split as the legacy availability lookup it replaces
 * (`findAvailableEMployee`): parity of the day's ordinal position in the year.
 */
export const getBiWeek = (date: Date): "week1" | "week2" => {
  const newYear = new Date(date.getFullYear(), 0, 1);
  const dayNumber = Math.floor((+date - +newYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((date.getDay() + 1 + dayNumber) / 7);
  return weekNumber % 2 ? "week2" : "week1";
};

const toMinuteWindows = (
  rows: ReadonlyArray<{ start_time: string; end_time: string }>,
): MinuteWindow[] =>
  rows.map((row) => ({
    start: timeToMinutes(row.start_time),
    end: timeToMinutes(row.end_time),
  }));

/** The Employee's Workday rows for the Task's weekday and bi-week, `is_working` only. */
export async function findEmployeeWorkdaysForDate(
  EmployeeWorkdays: ModelStatic<EmployeeWorkdaysModel>,
  employeeId: number,
  taskDate: Date,
  transaction?: Transaction,
): Promise<EmployeeWorkdaysModel[]> {
  return EmployeeWorkdays.findAll({
    where: {
      employee_id: employeeId,
      day_of_week: weekday(taskDate),
      week: getBiWeek(taskDate),
      is_working: true,
    },
    order: [["start_time", "ASC"]],
    ...(transaction ? { transaction } : {}),
  });
}

/**
 * The Employee's Time ranges that day, across every Task, oldest rule intact:
 * touching ranges are not overlaps (see `validateTimeRange`).
 */
export async function findEmployeeRangesForDate(
  EmployeeTaskTimeRange: ModelStatic<EmployeeTaskTimeRangeModel>,
  Task: ModelStatic<TaskModel>,
  employeeId: number,
  taskDate: Date,
  options: { excludeTaskId?: number; excludeRangeId?: number } = {},
  transaction?: Transaction,
): Promise<EmployeeTaskTimeRangeModel[]> {
  const where: Record<string, unknown> = { EmployeeId: employeeId };
  if (options.excludeRangeId !== undefined) {
    where.id = { [Op.ne]: options.excludeRangeId };
  }
  if (options.excludeTaskId !== undefined) {
    where.TaskId = { [Op.ne]: options.excludeTaskId };
  }

  return EmployeeTaskTimeRange.findAll({
    where,
    include: [
      {
        model: Task,
        attributes: [],
        required: true,
        where: {
          scheduled_date: {
            [Op.gte]: startOfDay(taskDate).toDate(),
            [Op.lte]: endOfDay(taskDate).toDate(),
          },
        },
      },
    ],
    ...(transaction ? { transaction } : {}),
  });
}

/** Builds what `validateTimeRange` needs to check a candidate range for `employeeId` on `task`. */
export async function buildTimeRangeContext(
  models: TimeRangeModels,
  params: {
    employeeId: number;
    task: Pick<TaskModel, "start_time" | "end_time" | "scheduled_date">;
    excludeRangeId?: number;
    transaction?: Transaction;
  },
): Promise<TimeRangeContext> {
  const [workdays, ranges] = await Promise.all([
    findEmployeeWorkdaysForDate(
      models.EmployeeWorkdays,
      params.employeeId,
      params.task.scheduled_date,
      params.transaction,
    ),
    findEmployeeRangesForDate(
      models.EmployeeTaskTimeRange,
      models.Task,
      params.employeeId,
      params.task.scheduled_date,
      params.excludeRangeId !== undefined ? { excludeRangeId: params.excludeRangeId } : {},
      params.transaction,
    ),
  ]);

  return {
    task: taskWindow(params.task),
    workWindows: toMinuteWindows(workdays),
    otherRanges: toMinuteWindows(ranges),
  };
}

/** Throws the 409 for `range`'s first broken rule, in French, from the validator's own reasons. */
export function assertValidTimeRange(range: MinuteWindow, context: TimeRangeContext): void {
  const check = validateTimeRange(range, context);
  if (!check.ok) {
    throw new createHttpError.Conflict(TIME_RANGE_VIOLATION_MESSAGES[check.reason]);
  }
}

/**
 * Clamps every Time range on `tasks` into `window`, drops ranges left under
 * the minimum, and removes an Assignment left with none.
 * `tasks` must share `window` (e.g. Tasks generated from the same TaskSchedule).
 */
export async function clampTimeRangesToWindow(
  EmployeeTaskTimeRange: ModelStatic<EmployeeTaskTimeRangeModel>,
  tasks: ReadonlyArray<Pick<TaskModel, "id" | "removeEmployee">>,
  window: MinuteWindow,
  transaction: Transaction,
): Promise<void> {
  if (tasks.length === 0) return;

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const ranges = await EmployeeTaskTimeRange.findAll({
    where: { TaskId: { [Op.in]: [...taskById.keys()] } },
    transaction,
  });
  if (ranges.length === 0) return;

  interface AssignmentTally {
    taskId: number;
    employeeId: number;
    survivingCount: number;
  }
  const tallies = new Map<string, AssignmentTally>();
  const idsToDelete: number[] = [];

  for (const range of ranges) {
    const assignmentKey = `${range.TaskId}:${range.EmployeeId}`;
    let tally = tallies.get(assignmentKey);
    if (!tally) {
      tally = { taskId: range.TaskId, employeeId: range.EmployeeId, survivingCount: 0 };
      tallies.set(assignmentKey, tally);
    }

    const previousStart = timeToMinutes(range.start_time);
    const previousEnd = timeToMinutes(range.end_time);
    const clipped = clipWindow({ start: previousStart, end: previousEnd }, window);

    if (!clipped || clipped.end - clipped.start < TIME_RANGE_MIN_MINUTES) {
      idsToDelete.push(range.id);
      continue;
    }
    tally.survivingCount += 1;

    const { start, end } = clipped;
    if (start !== previousStart || end !== previousEnd) {
      await range.update(
        { start_time: minutesToTime(start), end_time: minutesToTime(end) },
        { transaction },
      );
    }
  }

  if (idsToDelete.length > 0) {
    await EmployeeTaskTimeRange.destroy({
      where: { id: { [Op.in]: idsToDelete } },
      transaction,
    });
  }

  for (const { taskId, employeeId, survivingCount } of tallies.values()) {
    if (survivingCount > 0) continue;
    const task = taskById.get(taskId);
    if (!task) continue;
    await task.removeEmployee(employeeId, { transaction });
  }
}
