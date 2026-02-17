/**
 * @typedef {Object} CollectionPointCreateAttributes
 * @property {string} name - Name of the collection point (required, unique)
 * @property {string|null} [address] - Physical address of the collection point
 * @property {string|null} [city] - City where the collection point is located
 * @property {string|null} [postal_code] - Postal code of the collection point location
 * @property {string|null} [contact_person] - Name of the contact person (alphanumeric)
 * @property {string|null} [contact_phone] - Phone number of the contact person
 * @property {string|null} [contact_email] - Email address of the contact person
 * @property {"standard"| "entreprise"| "association"| "school"| "hospital"| "other"|null} [type] - Type of collection point (default: "standard")
 * @property {string|null} [notes] - Additional notes about the collection point
 * @property {boolean} [is_active] - Whether the collection point is currently active (default: true)
 * @property {number|null} [recyclery_id] - Foreign key reference to the Recyclery
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} CollectionPointRow
 * @property {string} name
 * @property {string|null} address
 * @property {string|null} city
 * @property {string|null} postal_code
 * @property {string|null} contact_person
 * @property {string|null} contact_phone
 * @property {string|null} contact_email
 * @property {"standard"|"entreprise"|"association"|"school"|"hospital"|"other"|null} type
 * @property {string|null} notes
 * @property {boolean} is_active
 * @property {number|null} recyclery_id
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &CollectionPointRow} CollectionPointAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} CollectionPointInstanceAssociations
 * @property {import("./recycleryModel.js").RecycleryInstance} [Recyclery] - Associated Recyclery when loaded with include
 * @property {Array<import("./taskScheduleModel.js").TaskScheduleInstance>} [TaskSchedules] - Task schedules when loaded with include
 * @property {Array<import("./taskModel.js").TaskInstance>} [Tasks] - Tasks when loaded with include
 * @property {Array<import("./arrivalModel.js").ArrivalInstance>} [Arrivals] - Arrivals when loaded with include
 *
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated.
 *
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setRecyclery - Set or unset the Recyclery for this collection point. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 *
 * @property {() => Promise<Array<import("./arrivalModel.js").ArrivalInstance>>} getArrivals - Get all arrivals associated with this collection point (has-many relationship through collection_point_id foreign key).
 *
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} setArrivals - Replace all arrivals associated with this collection point. Takes an array of Arrival instances or arrival IDs.
 *
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} addArrivals - Add one or more arrivals to this collection point. Takes an array of Arrival instances or arrival IDs.
 *
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} removeArrivals - Remove one or more arrivals from this collection point. Takes an array of Arrival instances or arrival IDs.
 *
 * @property {(values?: import("./arrivalModel.js").ArrivalCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./arrivalModel.js").ArrivalInstance>} createArrival - Create a new arrival for this collection point (has-many).
 *
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this collection point (has-many relationship).
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} setTasks - Replace all tasks associated with this collection point. Takes an array of Task instances or task IDs.
 *
 * @property {(task: import("./taskModel.js").TaskInstance|number) => Promise<void>} addTask - Add a task to this collection point.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} addTasks - Add one or more tasks to this collection point. Takes an array of Task instances or task IDs.
 *
 * @property {(task: import("./taskModel.js").TaskInstance|number) => Promise<void>} removeTask - Remove a task from this collection point.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} removeTasks - Remove one or more tasks from this collection point. Takes an array of Task instances or task IDs.
 *
 * @property {(values?: import("./taskModel.js").TaskCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new task for this collection point (has-many).
 *
 * @property {() => Promise<Array<import("./taskScheduleModel.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules associated with this collection point (has-many relationship through collection_point_id foreign key). CASCADE delete enabled.
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>) => Promise<void>} setTaskSchedules - Replace all task schedules associated with this collection point. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedule: import("./taskScheduleModel.js").TaskScheduleInstance|number) => Promise<void>} addTaskSchedule - Add a task schedule to this collection point.
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>) => Promise<void>} addTaskSchedules - Add one or more task schedules to this collection point. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedule: import("./taskScheduleModel.js").TaskScheduleInstance|number) => Promise<void>} removeTaskSchedule - Remove a task schedule from this collection point.
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>) => Promise<void>} removeTaskSchedules - Remove one or more task schedules from this collection point. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(values?: import("./taskScheduleModel.js").TaskScheduleCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./taskScheduleModel.js").TaskScheduleInstance>} createTaskSchedule - Create a new task schedule for this collection point (has-many).
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointAttributes, CollectionPointCreateAttributes> & CollectionPointAttributes & CollectionPointInstanceAssociations} CollectionPointInstance
 */
