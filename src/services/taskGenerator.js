"use strict";
import { Op } from "sequelize";
import logger from "./logger.js";
import { generateTasksBetweenDates } from "./taskScheduleUtils.js";

/**
 * Generates tasks for active recurring schedules
 * This function should be called periodically (e.g., daily) to ensure
 * that future tasks are always available for recurring schedules
 *
 * @param {import("../models/index.js").default} db - Database models instance
 * @returns {Promise<{created: number, schedules: number}>}
 */
export async function generateFutureTasks(db) {
  const { TaskSchedule, Task } = db;
  const now = new Date();
  let totalCreated = 0;
  let processedSchedules = 0;

  try {
    // Find all active recurring schedules
    const activeSchedules = await TaskSchedule.findAll({
      where: {
        is_recurring: true,
        recurrence_pattern: {
          [Op.not]: null,
        },
      },
    });

    logger.info(`Found ${activeSchedules.length} active recurring schedule(s) to process`);

    for (const schedule of activeSchedules) {
      try {
        // Get the latest task for this schedule to determine where to start generating
        const latestTask = await Task.findOne({
          where: {
            schedule_id: schedule.id,
          },
          order: [["scheduled_date", "DESC"]],
        });

        // Determine the start date for generating new tasks
        let startDate;
        if (latestTask && latestTask.scheduled_date) {
          // Start from the day after the latest task
          startDate = new Date(latestTask.scheduled_date);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          // If no tasks exist, use the schedule's scheduled_date or current date
          startDate = schedule.scheduled_date
            ? new Date(schedule.scheduled_date)
            : new Date(now);
        }

        // Calculate end date (one month from now)
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);

        // Only generate if we need to create tasks up to the end date
        if (startDate >= endDate) {
          continue; // Already have enough tasks
        }

        // Get existing task dates to avoid duplicates
        const existingTasks = await Task.findAll({
          where: {
            schedule_id: schedule.id,
            scheduled_date: {
              [Op.gte]: startDate,
              [Op.lte]: endDate,
            },
          },
          attributes: ["scheduled_date"],
        });

        const existingDates = new Set(
          existingTasks.map((t) => {
            const d = new Date(t.scheduled_date);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          })
        );

        const scheduleData = schedule.dataValues;

        // Generate tasks based on recurrence pattern using shared utility
        const tasksToCreate = generateTasksBetweenDates(
          startDate,
          endDate,
          schedule.recurrence_pattern,
          scheduleData,
          schedule.id,
          existingDates
        );

        // Bulk create tasks if any were generated
        if (tasksToCreate.length > 0) {
          await Task.bulkCreate(tasksToCreate);
          totalCreated += tasksToCreate.length;
          logger.info(
            `Created ${tasksToCreate.length} task(s) for schedule ${schedule.id} (${schedule.recurrence_pattern})`
          );
        }

        processedSchedules++;
      } catch (error) {
        logger.error(
          `Error processing schedule ${schedule.id}: ${error.message}`,
          error
        );
      }
    }

    logger.info(
      `Task generation completed: ${totalCreated} task(s) created for ${processedSchedules} schedule(s)`
    );

    return {
      created: totalCreated,
      schedules: processedSchedules,
    };
  } catch (error) {
    logger.error(`Error in generateFutureTasks: ${error.message}`, error);
    throw error;
  }
}
