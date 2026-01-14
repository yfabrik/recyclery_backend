/**
 * @typedef {Object} TaskScheduleCreateAttributes
 * @property {string} name - The name of the task schedule
 * @property {string} [description] - Detailed description of the task schedule
 * @property {string} category - Category classification of the task schedule
 * @property {string} priority - Priority level of the task schedule (e.g., "low", "medium", "high", "urgent")
 * @property {number} [estimated_duration] - Estimated duration in minutes
 * @property {string|string[]} [required_skills] - Required skills for the task (stored as TEXT, can be JSON string or array)
 * @property {string} [location] - Location where the task should be performed
 * @property {string|string[]} [equipment_needed] - Equipment needed for the task (stored as TEXT, can be JSON string or array)
 * @property {number|string} hourly_rate - Hourly rate for the task (DECIMAL type)
 * @property {boolean} [is_recurring] - Whether the task schedule is recurring
 * @property {string} [notes] - Additional notes about the task schedule
 * @property {string} [status] - Current status of the task schedule
 * @property {Date|string} scheduled_date - Base date when the task schedule starts
 * @property {string} start_time - Start time of the task in "HH:mm:ss" format (TIME type)
 * @property {string} end_time - End time of the task in "HH:mm:ss" format (TIME type)
 * @property {string} [recurrence_pattern] - Recurrence pattern: "daily", "weekly", or "monthly"
 * @property {number|null} [store_id] - Foreign key reference to the associated Recyclery
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskScheduleCreateAttributes} TaskScheduleAttributes
 */

/**
 * @typedef {import("sequelize").Model<TaskScheduleAttributes, TaskScheduleCreateAttributes> & TaskScheduleAttributes} TaskScheduleInstance
 * 
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this schedule (has-many relationship). Tasks are automatically created based on recurrence pattern.
 * 
 * @property {(task: import("./taskModel.js").TaskCreateAttributes) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new task for this schedule. Takes task creation attributes.
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated. Uses "store_id" foreign key.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this schedule. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 */
