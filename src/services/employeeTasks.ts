/**
 * How one Task stands for one Employee on one day. Pure over minute windows so
 * it stays testable without a database; the controller feeds it Workday hours
 * and Time ranges.
 */
import {
  assignableWindows,
  overlap,
  type MinuteWindow,
} from "@recyclerie/api/domain/timeRange";

/** One of the Employee's Time ranges that day, on any Task. */
export interface HeldRange extends MinuteWindow {
  taskId: number;
}

export type EmployeeTaskClassification =
  | { status: "assigned" | "assignable"; freeWindows: MinuteWindow[] }
  | { status: "unavailable"; reason: "outside-hours" | "vacation"; freeWindows: [] }
  | {
      status: "unavailable";
      reason: "busy";
      freeWindows: [];
      /** The Task holding the Employee's blocking Time range. */
      blockedByTaskId?: number;
    };

export function classifyEmployeeTask(input: {
  taskId: number;
  task: MinuteWindow;
  workWindows: MinuteWindow[];
  /** All the Employee's Time ranges that day, this Task's included. */
  ranges: HeldRange[];
  /** A Vacation covers the day: no new Assignment, whatever the hours say. */
  onVacation?: boolean;
}): EmployeeTaskClassification {
  const { taskId, task, workWindows, ranges, onVacation = false } = input;
  const otherRanges = ranges.filter((range) => range.taskId !== taskId);

  // Same call the front makes from the available-employees data of this Task.
  const freeWindows = assignableWindows({ task, workWindows, otherRanges });

  // A Task the Employee still holds stays assigned on a Vacation day (a Vacation conflict).
  if (otherRanges.length < ranges.length) return { status: "assigned", freeWindows };
  if (onVacation) return { status: "unavailable", reason: "vacation", freeWindows: [] };
  if (freeWindows.length > 0) return { status: "assignable", freeWindows };

  const withinHours = assignableWindows({ task, workWindows, otherRanges: [] });
  if (withinHours.length === 0) {
    return { status: "unavailable", reason: "outside-hours", freeWindows: [] };
  }

  const blocker = [...otherRanges]
    .sort((a, b) => a.start - b.start || a.end - b.end || a.taskId - b.taskId)
    .find((range) => withinHours.some((window) => overlap(window, range)));
  return {
    status: "unavailable",
    reason: "busy",
    freeWindows: [],
    ...(blocker && { blockedByTaskId: blocker.taskId }),
  };
}
