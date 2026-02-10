/**
 * @typedef {Object} UserCreateAttributes
 * @property {string} username - Username for the user
 * @property {string} email - Email address (must be unique and valid email format)
 * @property {string} password - Password hash (excluded from default scope)
 * @property {string} [password_hash] - Password hash (excluded from default scope)
 * 
 * @property {string} [role] - User role (default: "employee")
 * @property {string} [phone] - Phone number
 * @property {number} [contract_hours] - Contract hours per week (default: 35)
 * @property {boolean} [isActive] - Whether the user account is active (default: true)
 * @property {Date|string} [last_login] - Date and time of last login
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & UserCreateAttributes} UserAttributes
 */

/**
 * @typedef {import("sequelize").Model<UserAttributes, UserCreateAttributes> & UserAttributes} UserInstance
 * 
 * @property {() => Promise<Array<import("./donationModel.js").DonationInstance>>} getDonations - Get all donations received by this user (has-many relationship through "received_by" foreign key).
 * 
 * @property {() => Promise<Array<import("./salesTransactionModel.js").SalesTransactionInstance>>} getSalesTransactions - Get all sales transactions created by this user (has-many relationship through "sold_by" foreign key).
 * 
 * @property {() => Promise<Array<import("./collectionSchedule.js").CollectionScheduleInstance>>} getCollectionSchedules - Get all collection schedules assigned to this user (many-to-many relationship through "user_schedule" table).
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} setCollectionSchedules - Replace all collection schedules for this user. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} addCollectionSchedules - Add one or more collection schedules to this user. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} removeCollectionSchedules - Remove one or more collection schedules from this user. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {() => Promise<Array<import("./collectionReceiptModel.js").CollectionReceiptInstance>>} getCollectionReceipts - Get all collection receipts processed by this user (has-many relationship through "processed_by" foreign key).
 * 
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items created by this user (has-many relationship through "created_by" foreign key).
 * 
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks assigned to this user (many-to-many relationship through "task_user" table).
 * 
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} setTasks - Replace all tasks for this user. Takes an array of Task instances or task IDs.
 * 
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} addTasks - Add one or more tasks to this user. Takes an array of Task instances or task IDs.
 * 
 * @property {(tasks: Array<import("./taskModel.js").TaskInstance|number>) => Promise<void>} removeTasks - Remove one or more tasks from this user. Takes an array of Task instances or task IDs.
 * 
 * @property {() => Promise<Array<import("./arrivalModel.js").ArrivalInstance>>} getArrivals - Get all arrivals processed by this user (has-many relationship through "processed_by" foreign key).
 * 
 * @property {() => Promise<Array<import("./taskSchedule.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules assigned to this user (has-many relationship through "assigned_to" foreign key).
 * 
 * @property {() => Promise<Array<import("./recycleryModel.js").RecycleryInstance>>} getStores - Get all recycleries where this user is an employee (many-to-many relationship through "EmployeeStore" table). Uses "stores" alias.
 * 
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} setStores - Replace all recycleries for this user. Takes an array of Recyclery instances or recyclery IDs.
 * 
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} addStores - Add one or more recycleries to this user. Takes an array of Recyclery instances or recyclery IDs.
 * 
 * @property {(stores: Array<import("./recycleryModel.js").RecycleryInstance|number>) => Promise<void>} removeStores - Remove one or more recycleries from this user. Takes an array of Recyclery instances or recyclery IDs.
 * 
 * @property {() => Promise<Array<import("./recycleryModel.js").RecycleryInstance>>} getManagedStores - Get all recycleries managed by this user (has-many relationship through "manager_id" foreign key). Uses "managedStores" alias.
 * 
 * @property {() => Promise<Array<import("./employeeWorkday.js").EmployeeWorkdaysInstance>>} getEmployeeWorkdays - Get all employee workdays for this user (has-many relationship through "employee_id" foreign key).
 */

