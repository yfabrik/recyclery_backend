"use strict";

import type { InferAttributes, InferCreationAttributes } from "sequelize";
import type TaskSchedule from "../models/taskschedule.js";
import type Task from "../models/task.js";
import type { DateYMD } from "../date.js";

export const recurrencePatternRegistry = {
  daily: { stepDays: 1, stepMonths: 0, occurrences: 30 },
  weekly: { stepDays: 7, stepMonths: 0, occurrences: 5 },
  monthly: { stepDays: 0, stepMonths: 1, occurrences: 2 },
  default: { stepDays: 0, stepMonths: 0, occurrences: 1 },
} as const satisfies Record<
  Exclude<TaskSchedule["recurrence_pattern"] | "default", null>,
  { stepDays: number; stepMonths: number; occurrences: number }
>;

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add months to a date
 */
export const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Create a task object from schedule data
 */
export const createTaskObject = (
  schedule: InferAttributes<TaskSchedule>,
  scheduledDate: Date,
): InferCreationAttributes<Task> => {
  const task = {
    name: schedule.name,
    category: schedule.category,
    scheduled_date: scheduledDate,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    schedule_id: schedule.id,
  } as InferCreationAttributes<Task>;

  const optionalFields = [
    "description",
    "priority",
    "required_skills",
    "location",
    "equipment_needed",
    "hourly_rate",
    "notes",
    "status",
    "store_id",
    "collection_point_id",
  ] as const satisfies readonly (keyof InferCreationAttributes<Task>)[];
  for (const key of optionalFields) {
    if (schedule[key] !== undefined && schedule[key] !== null)
      Object.assign(task, { [key]: schedule[key] });
  }

  return task;
};

/**
 * Generate tasks based on recurrence pattern and occurrences
 * @returns Array of task objects ready for creation
 */
export const generateTasksFromSchedule = (
  baseDate: Date,
  isRecurring: boolean,
  schedule: InferAttributes<TaskSchedule>,
) => {
  const baseDateObj = new Date(baseDate);

  // If not recurring, use default (occurrences: 0) which means just one task on base date
  // if (!isRecurring) {
  //   return [createTaskObject(schedule, new Date(baseDateObj))];
  // }

  const cfg =
    recurrencePatternRegistry[
      isRecurring ? (schedule.recurrence_pattern ?? "default") : "default"
    ];
  // If occurrences is 0, create just one task on base date
  // if (cfg.occurrences === 0) {
  //   return [createTaskObject(schedule, new Date(baseDateObj))];
  // }

  // Generate tasks based on occurrences
  const tasksToCreate = [];
  for (let i = 0; i < cfg.occurrences; i++) {
    let taskDate = new Date(baseDateObj);

    // For daily/weekly: start from baseDate (i=0 gives baseDate)
    // For monthly: skip baseDate, start from baseDate + stepMonths (i=0 gives baseDate + stepMonths)
    if (cfg.stepDays > 0) {
      // Daily/weekly: baseDate + (i * stepDays)
      taskDate = addDays(taskDate, cfg.stepDays * i);
    }
    if (cfg.stepMonths > 0) {
      // Monthly: baseDate + ((i + 1) * stepMonths) to skip baseDate
      taskDate = addMonths(taskDate, cfg.stepMonths * i);
    }

    tasksToCreate.push(createTaskObject(schedule, taskDate));
  }

  return tasksToCreate;
};

/**
 * Generate tasks between startDate and endDate based on recurrence pattern
 * Used for continuous task generation (e.g., in taskGenerator service)
 * @param startDate - Start date (inclusive)
 * @param  endDate - End date (inclusive)
 * @param  schedule - Schedule data
 * @param [existingDates] - Set of existing date keys to avoid duplicates (format: "YYYY-M-D")
 * @returns Array of task objects ready for creation
 */
export const generateTasksBetweenDates = (
  startDate: Date,
  endDate: Date,
  schedule: InferAttributes<TaskSchedule>,
  existingDates: Set<DateYMD> = new Set(),
) => {
  const cfg =
    recurrencePatternRegistry[schedule.recurrence_pattern ?? "default"];

  const tasksToCreate = [] as InferCreationAttributes<Task>[];

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey =
      `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}` as DateYMD;

    if (!existingDates.has(dateKey)) {
      tasksToCreate.push(createTaskObject(schedule, new Date(currentDate)));
    }

    // Move to next occurrence based on pattern
    if (cfg.stepDays > 0) {
      currentDate = addDays(currentDate, cfg.stepDays);
    } else if (cfg.stepMonths > 0) {
      currentDate = addMonths(currentDate, cfg.stepMonths);
    } else {
      // No step defined, break to avoid infinite loop
      break;
    }
  }

  return tasksToCreate;
};
