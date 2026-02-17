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
 * @property {Date|string} [scheduled_date] - Date when the task is scheduled
 * @property {Date|string} [start_time] - Start time of the task (DATE type)
 * @property {Date|string} [end_time] - End time of the task (DATE type)
 * @property {string|null} [notes] - Additional notes about the task
 * @property {string|null} [status] - Current status of the task (e.g., "pending", "in_progress", "completed", "cancelled")
 * @property {number|null} [schedule_id] - Foreign key reference to the associated TaskSchedule
 * @property {number|null} [store_id] - Foreign key reference to the associated Recyclery
 * @property {number|null} [collection_point_id] - Foreign key reference to the associated CollectionPoint
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} TaskRow
 * @property {string} name
 * @property {string|null} description
 * @property {"vente"|"point"|"collection"|"custom"} category
 * @property {string|null} priority
 * @property {string|null} required_skills
 * @property {string|null} location
 * @property {string|null} equipment_needed
 * @property {number|string|null} hourly_rate
 * @property {Date|string|null} scheduled_date
 * @property {Date|string|null} start_time
 * @property {Date|string|null} end_time
 * @property {string|null} notes
 * @property {string|null} status
 * @property {number|null} schedule_id
 * @property {number|null} store_id
 * @property {number|null} collection_point_id
 * @property {string|null} day_of_week - Virtual
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &TaskRow} TaskAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} TaskInstanceAssociations
 * @property {import("./taskScheduleModel.js").TaskScheduleInstance} [TaskSchedule] - Associated TaskSchedule when loaded with include
 * @property {import("./recycleryModel.js").RecycleryInstance} [Recyclery] - Associated Recyclery when loaded with include (store_id)
 * @property {import("./collectionPointModel.js").CollectionPointInstance} [CollectionPoint] - Associated CollectionPoint when loaded with include
 * @property {Array<import("./employeeModel.js").EmployeeInstance>} [Employees] - Employees when loaded with include
 *
 * @property {() => Promise<import("./taskScheduleModel.js").TaskScheduleInstance|null>} getTaskSchedule - Get the associated TaskSchedule (belongs-to relationship). Returns null if no schedule is associated.
 *
 * @property {(taskSchedule: import("./taskScheduleModel.js").TaskScheduleInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setTaskSchedule - Set or unset the TaskSchedule for this task. Takes a TaskSchedule instance, schedule ID, or null to remove the association.
 *
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated.
 *
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setRecyclery - Set or unset the Recyclery for this task. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 *
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance|null>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship). Returns null if no collection point is associated.
 *
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setCollectionPoint - Set or unset the CollectionPoint for this task. Takes a CollectionPoint instance, collection point ID, or null to remove the association.
 *
 * @property {() => Promise<Array<import("./employeeModel.js").EmployeeInstance>>} getEmployees - Get all employees associated with this task (many-to-many relationship through "employee_task" table).
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} setEmployees - Replace all employees associated with this task. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} addEmployees - Add one or more employees to this task. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} removeEmployees - Remove one or more employees from this task. Takes an array of Employee instances or employee IDs.
 *
 * @property {(values?: import("./employeeModel.js").EmployeeCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./employeeModel.js").EmployeeInstance>} createEmployee - Create a new Employee and add to this task (belongsToMany).
 */

/**
 * @typedef {import("sequelize").Model<TaskAttributes, TaskCreateAttributes> & TaskAttributes & TaskInstanceAssociations} TaskInstance
 */
