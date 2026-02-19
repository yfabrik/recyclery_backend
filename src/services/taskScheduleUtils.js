"use strict";

/**
 * @typedef {Object} RecurrencePatternConfig
 * @property {number} stepDays - Number of days to step between occurrences (0 if not used)
 * @property {number} stepMonths - Number of months to step between occurrences (0 if not used)
 * @property {number} occurrences - Number of occurrences to generate
 */

/**
 * Registry pattern (data-only) for recurrence patterns.
 * All patterns have both stepDays and stepMonths, with occurrences count.
 * @type {Record<string, RecurrencePatternConfig>}
 */
export const recurrencePatternRegistry = {
  daily: { stepDays: 1, stepMonths: 0, occurrences: 30 },
  weekly: { stepDays: 7, stepMonths: 0, occurrences: 5 },
  monthly: { stepDays: 0, stepMonths: 1, occurrences: 1 },
  default: { stepDays: 0, stepMonths: 0, occurrences: 0 },
};

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date object
 */
export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add months to a date
 * @param {Date} date - Base date
 * @param {number} months - Number of months to add
 * @returns {Date} New date object
 */
export const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Create a task object from schedule data
 * @param {import("../models/types/taskScheduleModel.js").TaskScheduleCreateAttributes|import("../models/types/taskScheduleModel.js").TaskScheduleAttributes} data - Schedule data object
 * @param {number} scheduleId - Schedule ID
 * @param {Date} scheduledDate - Scheduled date for the task
 * @returns {import("../models/types/taskModel.js").TaskCreateAttributes} Task object ready for creation
 */
export const createTaskObject = (data, scheduleId, scheduledDate) => {
  const task = {
    name: data.name,
    category: data.category,
    scheduled_date: scheduledDate,
    start_time: data.start_time,
    end_time: data.end_time,
    schedule_id: scheduleId,
  };

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
  ];
  for (const key of optionalFields) {
    if (data[key] !== undefined && data[key] !== null)
      Object.assign(task, { [key]: data[key] });
  }

  return task;
};

/**
 * Generate tasks based on recurrence pattern and occurrences
 * @param {Date} baseDate - Base date to start from
 * @param {"daily"|"weekly"|"monthly"|string|null} recurrencePattern - Pattern name (daily, weekly, monthly)
 * @param {boolean} isRecurring - Whether the schedule is recurring
 * @param {import("../models/types/taskScheduleModel.js").TaskScheduleCreateAttributes|import("../models/types/taskScheduleModel.js").TaskScheduleAttributes} data - Schedule data
 * @param {number} scheduleId - Schedule ID
 * @returns {Array<import("../models/types/taskModel.js").TaskCreateAttributes>} Array of task objects ready for creation
 */
export const generateTasksFromSchedule = (
  baseDate,
  recurrencePattern,
  isRecurring,
  data,
  scheduleId,
) => {
  const baseDateObj = new Date(baseDate);

  // If not recurring, use default (occurrences: 0) which means just one task on base date
  if (!isRecurring) {
    return [createTaskObject(data, scheduleId, new Date(baseDateObj))];
  }

  const cfg =
    recurrencePatternRegistry[recurrencePattern] ||
    recurrencePatternRegistry.default;

  // If occurrences is 0, create just one task on base date
  if (cfg.occurrences === 0) {
    return [createTaskObject(data, scheduleId, new Date(baseDateObj))];
  }

  // Generate tasks based on occurrences
  const tasksToCreate = [];

  for (let i = 0; i < cfg.occurrences; i++) {
    let taskDate = new Date(baseDateObj);

    // For daily/weekly: start from baseDate (i=0 gives baseDate)
    // For monthly: skip baseDate, start from baseDate + stepMonths (i=0 gives baseDate + stepMonths)
    if (cfg.stepDays > 0) {
      // Daily/weekly: baseDate + (i * stepDays)
      taskDate = addDays(taskDate, cfg.stepDays * i);
    } else if (cfg.stepMonths > 0) {
      // Monthly: baseDate + ((i + 1) * stepMonths) to skip baseDate
      taskDate = addMonths(taskDate, cfg.stepMonths * (i + 1));
    }

    tasksToCreate.push(createTaskObject(data, scheduleId, taskDate));
  }

  return tasksToCreate;
};

/**
 * Generate tasks between startDate and endDate based on recurrence pattern
 * Used for continuous task generation (e.g., in taskGenerator service)
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @param {"daily"|"weekly"|"monthly"|string|null} recurrencePattern - Pattern name (daily, weekly, monthly)
 * @param {import("../models/types/taskScheduleModel.js").TaskScheduleCreateAttributes|import("../models/types/taskScheduleModel.js").TaskScheduleAttributes} data - Schedule data
 * @param {number} scheduleId - Schedule ID
 * @param {Set<string>} [existingDates] - Set of existing date keys to avoid duplicates (format: "YYYY-M-D")
 * @returns {Array<import("../models/types/taskModel.js").TaskCreateAttributes>} Array of task objects ready for creation
 */
export const generateTasksBetweenDates = (
  startDate,
  endDate,
  recurrencePattern,
  data,
  scheduleId,
  existingDates = new Set(),
) => {
  const cfg =
    recurrencePatternRegistry[recurrencePattern] ||
    recurrencePatternRegistry.default;
  const tasksToCreate = [];

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

    if (!existingDates.has(dateKey)) {
      tasksToCreate.push(
        createTaskObject(data, scheduleId, new Date(currentDate)),
      );
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
