/**
 * @typedef {Object} EmployeeCreateAttributes
 * @property {string} nom - Last name of the employee (required)
 * @property {string} prenom - First name of the employee (required)
 * @property {boolean} [isActive] - Whether the employee is currently active (default: true)
 * @property {string|null} [email] - Email address of the employee
 * @property {string|null} [phone] - Phone number of the employee
 *
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeCreateAttributes} EmployeeAttributes
 * @property {string} [fullName] - Virtual property: full name computed from nom and prenom (read-only)
 */

/**
 * @typedef {import("sequelize").Model<EmployeeAttributes, EmployeeCreateAttributes> & EmployeeAttributes} EmployeeInstance
 *
 * @property {Array<import("./recycleryModel.js").RecycleryInstance>} [stores] - Recycleries/stores when loaded with include (alias "stores")
 * @property {Array<import("./taskModel.js").TaskInstance>} [Tasks] - Tasks when loaded with include
 * @property {Array<import("./taskSchedule.js").TaskScheduleInstance>} [TaskSchedules] - Task schedules when loaded with include
 * @property {Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance>} [EmployeeWorkdays] - Workdays when loaded with include
 *
 * @property {() => Promise<Array<import("./recycleryModel.js").RecycleryInstance>>} getStores - Get all recycleries/stores associated with this employee (many-to-many relationship through "EmployeeStore" table). Uses "stores" alias.
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} setStores - Replace all recycleries/stores associated with this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} addStores - Add one or more recycleries/stores to this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} removeStores - Remove one or more recycleries/stores from this employee. Takes an array of Recyclery instances or recyclery IDs.
 *
 * @property {(values?: import("./recycleryModel.js").RecycleryCreateAttributes) => Promise<import("./recycleryModel.js").RecycleryInstance>} createStore - Create a new Recyclery and add it to this employee (belongsToMany with "stores" alias).
 *
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this employee (many-to-many relationship through "employee_task" table).
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} setTasks - Replace all tasks associated with this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} addTasks - Add one or more tasks to this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} removeTasks - Remove one or more tasks from this employee. Takes an array of Task instances or task IDs.
 *
 * @property {(values?: import("./taskModel.js").TaskCreateAttributes) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new Task and add it to this employee (belongsToMany).
 *
 * @property {() => Promise<Array<import("./taskSchedule.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules associated with this employee (many-to-many relationship through "employee_schedule" table).
 *
 * @property {(taskSchedules: Array<import("./taskSchedule.js").TaskScheduleInstance|number>) => Promise<void>} setTaskSchedules - Replace all task schedules associated with this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedules: Array<import("./taskSchedule.js").TaskScheduleInstance|number>) => Promise<void>} addTaskSchedules - Add one or more task schedules to this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(taskSchedules: Array<import("./taskSchedule.js").TaskScheduleInstance|number>) => Promise<void>} removeTaskSchedules - Remove one or more task schedules from this employee. Takes an array of TaskSchedule instances or schedule IDs.
 *
 * @property {(values?: import("./taskSchedule.js").TaskScheduleCreateAttributes) => Promise<import("./taskSchedule.js").TaskScheduleInstance>} createTaskSchedule - Create a new TaskSchedule and add it to this employee (belongsToMany).
 *
 * @property {() => Promise<Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance>>} getEmployeeWorkdays - Get all workdays associated with this employee (has-many relationship through employee_id foreign key).
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>) => Promise<void>} setEmployeeWorkdays - Replace all workdays associated with this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>) => Promise<void>} addEmployeeWorkdays - Add one or more workdays to this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(workdays: Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance|number>) => Promise<void>} removeEmployeeWorkdays - Remove one or more workdays from this employee. Takes an array of EmployeeWorkdays instances or workday IDs.
 *
 * @property {(values?: import("./employeeWorkday.js").EmployeeWorkdaysCreateAttributes) => Promise<import("./employeeWorkday.js").EmployeeWorkdaysInstance>} createEmployeeWorkdays - Create a new employee workday for this employee (has-many).
 */
