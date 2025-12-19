/**
 * @typedef {Object} CashSessionAttribute
 * @property {string} session_number
 * @property {number} opening_amount
 * @property {number} closing_amount
 * @property {number} expected_amount
 * @property {number} difference_amount
 * @property {"open"|"close"} status
 * @property {string} notes
 * @property {Date} closed_at
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CashSessionAttribute} CashSessionAttributes
 */

/**
 * @typedef {import("sequelize").Model<CashSessionAttributes, CashSessionAttributes> & CashSessionAttributes} CashSessionInstance
 * @property {Function} getCashRegister
 * @property {Function} getSalesTransactions
 * @property {Function} getUser
 * @property {Function} getRecyclery
 */