/**
 * @typedef {Object} dbObject
 * @property {string} dialect
 * @property {string} storage
 * @property {string} [database] - Optional field
 * @property {string} [username] - Optional field
 * @property {string} [password] - Optional field
 * @property {boolean} [logging] - Optional field
 */

/**
 * @typedef {Object} DbConfig
 * @property {dbObject} development
 * @property {dbObject} test
 * @property {dbObject} production
 * @property {string} [use_env_variable] - Optional field
 */


/**
 * @typedef {Object} DB
 * @property {import("sequelize")} Sequelize
 * @property {import("sequelize").Sequelize} sequelize
 * @typedef {DB & models} db
 */

/**
 * @typedef {Object} models
 * @property { import("sequelize").ModelStatic<any>} Arrival
 * @property { import("sequelize").ModelStatic<any>} CashRegister
 * @property { import("sequelize").ModelStatic<any>} CashSession
 * @property { import("sequelize").ModelStatic<any>} Category
 * @property { import("sequelize").ModelStatic<any>} CollectionPoint
 * @property { import("sequelize").ModelStatic<any>} CollectionPointPresence
 * @property { import("sequelize").ModelStatic<any>} CollectionReceipt
 * @property { import("sequelize").ModelStatic<any>} CollectionSchedule
 * @property { import("sequelize").ModelStatic<any>} Donation
 * @property { import("sequelize").ModelStatic<any>} EcoOrganism
 * @property { import("sequelize").ModelStatic<any>} EmployeeWorkdays
 * @property { import("sequelize").ModelStatic<any>} LabeledItem
 * @property { import("sequelize").ModelStatic<any>} RecurringSchedule
 * @property { import("sequelize").ModelStatic<any>} Recyclery
 * @property { import("sequelize").ModelStatic<any>} Refund
 * @property { import("sequelize").ModelStatic<any>} Role
 * @property { import("sequelize").ModelStatic<any>} SalesItem
 * @property { import("sequelize").ModelStatic<any>} SalesTransaction
 * @property { import("sequelize").ModelStatic<any>} StoreLocation
 * @property { import("sequelize").ModelStatic<any>} StoreHours
 * @property { import("sequelize").ModelStatic<any>} Task
 * @property { import("sequelize").ModelStatic<any>} TaskSchedule
 * @property { import("sequelize").ModelStatic<any>} User
 * @property { import("sequelize").ModelStatic<any>} WasteDisposal
 * @property { import("sequelize").ModelStatic<any>} EmployeeWorkdays
 * @property { import("sequelize").ModelStatic<any>} EmployeeStore
 */
