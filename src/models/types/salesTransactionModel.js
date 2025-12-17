/**
 * @typedef {Object} SalesTransactionAttributes
 * @property {number} [id]
 * @property {string} transaction_number
 * @property {number} total_amount
 * @property {string} payment_method
 * @property {number} payment_amount
 * @property {number} change_amount
 * @property {string} customer_name
 * @property {string} customer_email
 * @property {string} customer_postal_code
 * @property {string} status
 * @property {number} refunded_amount
 */

/**
 * @typedef {import("sequelize").Model<SalesTransactionAttributes, SalesTransactionAttributes> & SalesTransactionAttributes} SalesTransactionInstance
 * @property {Function} getSalesItems
 * @property {Function} getCreatedBy
 * @property {Function} getRecyclery
 * @property {Function} getCashSession
 * @property {Function} getLabeledItems
 */