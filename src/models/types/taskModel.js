/**
 * @typedef {Object} TaskCreateAttributes
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {string} priority
 * @property {string[]} required_skills
 * @property {string} location
 * @property {string[]} equipment_needed
 * @property {string} hourly_rate
 * @property {Date} scheduled_date
 * @property {Date} start_time
 * @property {Date} end_time
 * @property {string} notes
 * @property {string} status
 * @property {number|null} [schedule_id]
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskCreateAttributes} TaskAttributes
 * 
 */

/**
 * @typedef {import("sequelize").Model<TaskAttributes, TaskCreateAttributes> & TaskAttributes } TaskInstance

 */
