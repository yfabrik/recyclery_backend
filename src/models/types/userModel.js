
/**
 * @typedef {Object} UserAttributes
 * @property {number} [id]
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} role
 * @property {string} [phone]
 * @property {number} contract_hours
 * @property {boolean} isActive
 * @property {Date} [last_login]
 */

/**
 * @typedef {Object} UserCreationAttributes
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} [phone]
 * @property {number} [contract_hours]
 * @property {boolean} [isActive]
 */

/**
 * @typedef {import("sequelize").Model<UserAttributes, UserCreationAttributes> & UserAttributes} UserInstance
 * @property {Function} getDonations
 * @property {Function} getSalesTransactions
 * @property {Function} getCollectionSchedules
 * @property {Function} getCollectionReceipts
 * @property {Function} getTasks
 * @property {Function} getRecycleries
 * @property {Function} getManagedStores
 * @property {Function} getEmployeeWorkdays
 * @property {Function} getArrivals
 */

