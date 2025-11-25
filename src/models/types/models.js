/**
 * @typedef {Object} DB
 * @property {import("sequelize").Sequelize} Sequelize
 * @property {import("sequelize").Sequelize} sequelize
 * @typedef {DB & models} db
 */

/**
 * @typedef {Object} models
 * @property {typeof import("sequelize").Model} Arrival
 * @property {typeof import("sequelize").Model} CashRegister
 * @property {typeof import("sequelize").Model} CashSession
 * @property {typeof import("sequelize").Model} Category
 * @property {typeof import("sequelize").Model} CollectionPoint
 * @property {typeof import("sequelize").Model} CollectionPointPresence
 * @property {typeof import("sequelize").Model} CollectionReceipt
 * @property {typeof import("sequelize").Model} CollectionSchedule
 * @property {typeof import("sequelize").Model} Donation
 * @property {typeof import("sequelize").Model} EcoOrganism
 * @property {typeof import("sequelize").Model} EmployeeWorkdays
 * @property {typeof import("sequelize").Model} LabeledItem
 * @property {typeof import("sequelize").Model} RecurringSchedule
 * @property {typeof import("sequelize").Model} Recyclery
 * @property {typeof import("sequelize").Model} Refund
 * @property {typeof import("sequelize").Model} Role
 * @property {typeof import("sequelize").Model} SalesItem
 * @property {typeof import("sequelize").Model} SalesTransaction
 * @property {typeof import("sequelize").Model} StoreLocation
 * @property {typeof import("sequelize").Model} StoreHours
 * @property {typeof import("sequelize").Model} Task
 * @property {typeof import("sequelize").Model} TaskSchedule
 * @property {typeof import("sequelize").Model} User
 * @property {typeof import("sequelize").Model} WasteDisposal
 * @property {typeof import("sequelize").Model} EmployeeWorkdays
 */