/**
 * @typedef {Object} TaskScheduleCreateAttributes
 * @property {string} name - The name of the task schedule
 * @property {string|null} [description] - Detailed description of the task schedule
 * @property {"vente"|"point"|"collection"|"custom"} category - Category classification of the task schedule (required)
 * @property {string|null} [priority] - Priority level of the task schedule (e.g., "low", "medium", "high", "urgent")
 * @property {string|null} [required_skills] - Required skills for the task (stored as TEXT, can be JSON string or array)
 * @property {string|null} [location] - Location where the task schedule should be performed
 * @property {string|null} [equipment_needed] - Equipment needed for the task (stored as TEXT, can be JSON string or array)
 * @property {number|string|null} [hourly_rate] - Hourly rate for the task (DECIMAL type)
 * @property {boolean|null} [is_recurring] - Whether the task schedule is recurring (default: true)
 * @property {string|null} [notes] - Additional notes about the task schedule
 * @property {string|null} [status] - Current status of the task schedule
 * @property {Date|string} [scheduled_date] - Base date when the task schedule starts
 * @property {Date|string|null} [start_time] - Start time of the task (DATE type)
 * @property {Date|string|null} [end_time] - End time of the task (DATE type)
 * @property {"daily"|"weekly"|"monthly"|null} [recurrence_pattern] - Recurrence pattern: "daily", "weekly", or "monthly"
 * @property {number|null} [store_id] - Foreign key reference to the associated Recyclery
 * @property {number|null} [collection_point_id] - Foreign key reference to the associated CollectionPoint
 * 
 * @typedef {Object} TaskScheduleAttributesFetched
 * @property {string|null} [day_of_week] - Virtual property: day of the week computed from scheduled_date (read-only)   
 * 
 *
 * @typedef { import("./baseModelAttributes.js").baseAttributes & TaskScheduleCreateAttributes & TaskScheduleAttributesFetched} TaskScheduleAttributes
 */

/**
 * 
 * @typedef {Object} TaskScheduleInstanceFetched
 * @property {Array<import("./taskModel.js").TaskInstance>} [Tasks] - Tasks when loaded with include
 * @property {import("./recycleryModel.js").RecycleryInstance} [Recyclery] - Associated Recyclery when loaded with include (store_id)
 * @property {import("./collectionPointModel.js").CollectionPointInstance} [CollectionPoint] - Associated CollectionPoint when loaded with include
 * @property {Array<import("./employeeModel.js").EmployeeInstance>} [Employees] - Employees when loaded with include
*/
/**
 * @typedef {import("sequelize").Model<TaskScheduleAttributes, TaskScheduleCreateAttributes> & TaskScheduleAttributes & TaskScheduleInstanceFetched} TaskScheduleInstance
 *

 *
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this schedule (has-many relationship through schedule_id foreign key). Tasks are automatically created based on recurrence pattern. CASCADE delete enabled.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} setTasks - Replace all tasks associated with this schedule. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} addTasks - Add one or more tasks to this schedule. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} removeTasks - Remove one or more tasks from this schedule. Takes an array of Task instances or task IDs.
 *
 * @property {(values?: import("./taskModel.js").TaskCreateAttributes) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new task for this schedule (has-many).
 *
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated. Uses "store_id" foreign key.
 *
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this schedule. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 *
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance|null>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship). Returns null if no collection point is associated.
 *
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number|null) => Promise<void>} setCollectionPoint - Set or unset the CollectionPoint for this schedule. Takes a CollectionPoint instance, collection point ID, or null to remove the association.
 *
 * @property {() => Promise<Array<import("./employeeModel.js").EmployeeInstance>>} getEmployees - Get all employees associated with this task schedule (many-to-many relationship through "employee_schedule" table).
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} setEmployees - Replace all employees associated with this task schedule. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} addEmployees - Add one or more employees to this task schedule. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} removeEmployees - Remove one or more employees from this task schedule. Takes an array of Employee instances or employee IDs.
 *
 * @property {(values?: import("./employeeModel.js").EmployeeCreateAttributes) => Promise<import("./employeeModel.js").EmployeeInstance>} createEmployee - Create a new Employee and add to this task schedule (belongsToMany).
 */
