/**
 * @typedef {Object} TaskScheduleCreateAttributes
 * @property {string} name
 * @property {string} [description]
 * @property {string} category
 * @property {string} priority
 * @property {string[]} [required_skills]
 * @property {string} [location]
 * @property {string[]} [equipment_needed]
 * @property {string} hourly_rate
 * @property {Date} scheduled_date
 * @property {Date} start_time
 * @property {Date} end_time
 * @property {string} notes
 * @property {string} status
 * @property {string} recurrence_pattern
 * @property {boolean} is_recurring
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskScheduleCreateAttributes} TaskScheduleAttributes
 * 
 */

/**
 * @typedef {import("sequelize").Model<TaskScheduleAttributes, TaskScheduleCreateAttributes> & TaskScheduleAttributes } TaskScheduleInstance
 * @property {Function} createTask

 */
