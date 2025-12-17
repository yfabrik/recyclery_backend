/**
 * @typedef {Object} CashRegisterAttributes
 * @property {number} [id]
 * @property {string} name
 * @property {boolean} is_active
 */

/**
 * @typedef {import("sequelize").Model<CashRegisterAttributes, CashRegisterAttributes> & CashRegisterAttributes} CashRegisterInstance
 * @property {Function} getRecyclery
 * @property {Function} getSessions
 */