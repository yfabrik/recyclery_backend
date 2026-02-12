/**
 * @typedef {Object} TaskCreateAttributes
 * @property {string} name - The name of the task
 * @property {string|null} [description] - Detailed description of the task
 * @property {"vente"|"point"|"collection"|"custom"} category - Category classification of the task (required)
 * @property {string|null} [priority] - Priority level of the task (e.g., "low", "medium", "high", "urgent")
 * @property {string|null} [required_skills] - Required skills for the task (stored as TEXT, can be JSON string or array)
 * @property {string|null} [location] - Location where the task should be performed
 * @property {string|null} [equipment_needed] - Equipment needed for the task (stored as TEXT, can be JSON string or array)
 * @property {number|string|null} [hourly_rate] - Hourly rate for the task (DECIMAL type)
 * @property {Date|string} scheduled_date - Date when the task is scheduled
 * @property {Date|string|null} [start_time] - Start time of the task (DATE type)
 * @property {Date|string|null} [end_time] - End time of the task (DATE type)
 * @property {string|null} [notes] - Additional notes about the task
 * @property {string|null} [status] - Current status of the task (e.g., "pending", "in_progress", "completed", "cancelled")
 * @property {number|null} [schedule_id] - Foreign key reference to the associated TaskSchedule
 * @property {number|null} [store_id] - Foreign key reference to the associated Recyclery
 * @property {number|null} [collection_point_id] - Foreign key reference to the associated CollectionPoint
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskCreateAttributes} TaskAttributes
 * @property {string} [day_of_week] - Virtual property: day of the week computed from scheduled_date (read-only)
 */

/**
 * @typedef {import("sequelize").Model<TaskAttributes, TaskCreateAttributes> & TaskAttributes} TaskInstance
 * 
 * @property {() => Promise<import("./taskSchedule.js").TaskScheduleInstance|null>} getTaskSchedule - Get the associated TaskSchedule (belongs-to relationship). Returns null if no schedule is associated.
 * 
 * @property {(taskSchedule: import("./taskSchedule.js").TaskScheduleInstance|number|null) => Promise<void>} setTaskSchedule - Set or unset the TaskSchedule for this task. Takes a TaskSchedule instance, schedule ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this task. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance|null>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship). Returns null if no collection point is associated.
 * 
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number|null) => Promise<void>} setCollectionPoint - Set or unset the CollectionPoint for this task. Takes a CollectionPoint instance, collection point ID, or null to remove the association.
 * 
 * @property {() => Promise<Array<import("./employeeModel.js").EmployeeInstance>>} getEmployees - Get all employees associated with this task (many-to-many relationship through "employee_task" table).
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} setEmployees - Replace all employees associated with this task. Takes an array of Employee instances or employee IDs.
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} addEmployees - Add one or more employees to this task. Takes an array of Employee instances or employee IDs.
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} removeEmployees - Remove one or more employees from this task. Takes an array of Employee instances or employee IDs.
 */
