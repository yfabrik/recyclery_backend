/**
 * @typedef {Object} TaskCreateAttributes
 * @property {string} name - The name of the task
 * @property {string} [description] - Detailed description of the task
 * @property {string} category - Category classification of the task
 * @property {string} priority - Priority level of the task (e.g., "low", "medium", "high", "urgent")
 * @property {number} [estimated_duration] - Estimated duration in minutes
 * @property {string|string[]} [required_skills] - Required skills for the task (stored as TEXT, can be JSON string or array)
 * @property {string} [location] - Location where the task should be performed
 * @property {string|string[]} [equipment_needed] - Equipment needed for the task (stored as TEXT, can be JSON string or array)
 * @property {number|string} hourly_rate - Hourly rate for the task (DECIMAL type)
 * @property {Date|string} scheduled_date - Date when the task is scheduled
 * @property {string} start_time - Start time of the task in "HH:mm:ss" format (TIME type)
 * @property {string} end_time - End time of the task in "HH:mm:ss" format (TIME type)
 * @property {string} [notes] - Additional notes about the task
 * @property {string} status - Current status of the task (e.g., "pending", "in_progress", "completed", "cancelled")
 * @property {number|null} [schedule_id] - Foreign key reference to the associated TaskSchedule
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskCreateAttributes} TaskAttributes
 * @property {string} [day_of_week] - Virtual property: day of the week computed from scheduled_date (read-only)
 */

/**
 * @typedef {import("sequelize").Model<TaskAttributes, TaskCreateAttributes> & TaskAttributes} TaskInstance
 * 
 * @property {() => Promise<Array<import("./userModel.js").UserInstance>>} getUsers - Get all users associated with this task (many-to-many relationship through "task_user" table)
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} setUsers - Replace all users associated with this task. Takes an array of User instances or user IDs.
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} addUsers - Add one or more users to this task. Takes an array of User instances or user IDs.
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} removeUsers - Remove one or more users from this task. Takes an array of User instances or user IDs.
 * 
 * @property {() => Promise<import("./taskSchedule.js").TaskScheduleInstance|null>} getTaskSchedule - Get the associated TaskSchedule (belongs-to relationship). Returns null if no schedule is associated.
 * 
 * @property {(taskSchedule: import("./taskSchedule.js").TaskScheduleInstance|number|null) => Promise<void>} setTaskSchedule - Set or unset the TaskSchedule for this task. Takes a TaskSchedule instance, schedule ID, or null to remove the association.
 */
