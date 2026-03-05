/**
 * @typedef {Object} dbObject
 * @property {string} [dialect]
 * @property {string} [storage]
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
 * @property { import("sequelize").ModelStatic<import("./arrivalModel.js").ArrivalInstance>} Arrival
 * @property { import("sequelize").ModelStatic<import("./cashRegisterModel.js").CashRegisterInstance>} CashRegister
 * @property { import("sequelize").ModelStatic<import("./cashSessionModel.js").CashSessionInstance>} CashSession
 * @property { import("sequelize").ModelStatic<import("./categoryModel.js").CategoryInstance>} Category
 * @property { import("sequelize").ModelStatic<import("./collectionPointModel.js").CollectionPointInstance>} CollectionPoint
 * @property { import("sequelize").ModelStatic<import("./collectionPointPresenceModel.js").CollectionPointPresenceInstance>} CollectionPointPresence
 * @property { import("sequelize").ModelStatic<import("./collectionReceiptModel.js").CollectionReceiptInstance>} CollectionReceipt
 * @property { import("sequelize").ModelStatic<import("./collectionSchedule.js").CollectionScheduleInstance>} CollectionSchedule
 * @property { import("sequelize").ModelStatic<import("./donationModel.js").DonationInstance>} Donation
 * @property { import("sequelize").ModelStatic<import("./ecoOrganismModel.js").EcoOrganismInstance>} EcoOrganism
 * @property { import("sequelize").ModelStatic<import("./employeeModel.js").EmployeeInstance>} Employee
 * @property { import("sequelize").ModelStatic<import("./employeestoreModel.js").EmployeeStoreInstance>} EmployeeStore
 * @property { import("sequelize").ModelStatic<import("./employeeWorkday.js").EmployeeWorkdaysInstance>} EmployeeWorkdays
 * @property { import("sequelize").ModelStatic<import("./labeledItemModel.js").LabeledItemInstance>} LabeledItem
 * @property { import("sequelize").ModelStatic<any>} RecurringSchedule
 * @property { import("sequelize").ModelStatic<import("./recycleryModel.js").RecycleryInstance>} Recyclery
 * @property { import("sequelize").ModelStatic<any>} Refund
 * @property { import("sequelize").ModelStatic<any>} Role
 * @property { import("sequelize").ModelStatic<any>} Promotion
 * @property { import("sequelize").ModelStatic<any>} TransactionItem
 * @property { import("sequelize").ModelStatic<import("./salesTransactionModel.js").SalesTransactionInstance>} SalesTransaction
 * @property { import("sequelize").ModelStatic<any>} StoreLocation
 * @property { import("sequelize").ModelStatic<any>} StoreHours
 * @property { import("sequelize").ModelStatic<import("./taskModel.js").TaskInstance>} Task
 * @property { import("sequelize").ModelStatic<import("./taskScheduleModel.js").TaskScheduleInstance>} TaskSchedule
 * @property { import("sequelize").ModelStatic<import("./userModel.js").UserInstance>} User
 * @property { import("sequelize").ModelStatic<import("./wasteDisposalModel.js").WasteDisposalInstance>} WasteDisposal
 *
 */
