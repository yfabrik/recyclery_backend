/**
 * @typedef {Object} EmployeeCreateAttributes
 * @property {string} nom - Last name of the employee (required)
 * @property {string} prenom - First name of the employee (required)
 * @property {boolean|null} [isActive] - Whether the employee is currently active (default: true)
 * @property {string|null} [email] - Email address of the employee
 * @property {string|null} [phone] - Phone number of the employee
 */

/**
 * Attributes that are always defined after creation/fetch (optional at create, have default or stored).
 * @typedef {Object} EmployeeAttributesFetched
 * @property {boolean} isActive - Always defined when fetched (default: true at create)
 * @property {string|null} email - Always defined when fetched
 * @property {string|null} phone - Always defined when fetched
 * @property {string} fullName - Virtual: full name computed from nom and prenom (read-only)
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} EmployeeRow
 * @property {string} nom
 * @property {string} prenom
 * @property {boolean} isActive
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string} fullName - Virtual
 */

/** @typedef {import("./baseModelAttributes.js").baseAttributes &EmployeeRow} EmployeeAttributes */

/**
 * @typedef {Object} EmployeeInstanceAssociations
 * @property {Array<import("./recycleryModel.js").RecycleryInstance>} [stores] - Recycleries/stores when loaded with include (alias "stores")
 * @property {Array<import("./taskModel.js").TaskInstance>} [Tasks] - Tasks when loaded with include
 * @property {Array<import("./taskScheduleModel.js").TaskScheduleInstance>} [TaskSchedules] - Task schedules when loaded with include
 * @property {Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance>} [EmployeeWorkdays] - Workdays when loaded with include
 * 
 *
 * @property {() => Promise<Array<import("./recycleryModel.js").RecycleryInstance>>} getStores - Get all recycleries/stores associated with this employee (many-to-many relationship through "EmployeeStore" table). Uses "stores" alias.
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} setStores - Replace all recycleries/stores associated with this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(store: import("./recycleryModel.js").RecycleryInstance|number, options?: import("sequelize").BelongsToManyAddAssociationMixinOptions) => Promise<void>} addStore - Add one store to this employee (belongsToMany). Options include through (join attributes, e.g. is_primary) and transaction.
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} addStores - Add one or more recycleries/stores to this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(store: import("./recycleryModel.js").RecycleryInstance|number, options?: import("sequelize").BelongsToManyRemoveAssociationMixinOptions) => Promise<void>} removeStore - Remove one store from this employee (belongsToMany).
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} removeStores - Remove one or more recycleries/stores from this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(values?: import("./recycleryModel.js").RecycleryCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./recycleryModel.js").RecycleryInstance>} createStore - Create a new Recyclery and add it to this employee (belongsToMany with "stores" alias).
 *
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this employee (many-to-many relationship through "employee_task" table).
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} setTasks - Replace all tasks associated with this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} addTasks - Add one or more tasks to this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} removeTasks - Remove one or more tasks from this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(values?: import("./taskModel.js").TaskCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new Task and add it to this employee (belongsToMany).
 *
 * @property {() => Promise<Array<import("./taskScheduleModel.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules associated with this employee (many-to-many relationship through "employee_schedule" table).
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} setTaskSchedules - Replace all task schedules associated with this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} addTaskSchedules - Add one or more task schedules to this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedules: Array<import("./taskScheduleModel.js").TaskScheduleInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} removeTaskSchedules - Remove one or more task schedules from this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(values?: import("./taskScheduleModel.js").TaskScheduleCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./taskScheduleModel.js").TaskScheduleInstance>} createTaskSchedule - Create a new TaskSchedule and add it to this employee (belongsToMany).
 *
 * @property {() => Promise<Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance>>} getEmployeeWorkdays - Get all workdays associated with this employee (has-many relationship through employee_id foreign key).
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>, options?: import("sequelize").HasManySetAssociationsMixinOptions) => Promise<void>} setEmployeeWorkdays - Replace all workdays associated with this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>, options?: import("sequelize").HasManyAddAssociationMixinOptions) => Promise<void>} addEmployeeWorkdays - Add one or more workdays to this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>, options?: import("sequelize").HasManyRemoveAssociationMixinOptions) => Promise<void>} removeEmployeeWorkdays - Remove one or more workdays from this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(values?: import("./employeeWorkday.js").EmployeeWorkdaysCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./employeeWorkday.js").EmployeeWorkdaysInstance>} createEmployeeWorkdays - Create a new employee workday for this employee (has-many).
 
 */
/**
 * @typedef {import("sequelize").Model<EmployeeAttributes, EmployeeCreateAttributes> & EmployeeAttributes & EmployeeInstanceAssociations} EmployeeInstance
 */
