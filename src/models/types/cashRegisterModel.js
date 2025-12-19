/**
 * @typedef {Object} CashRegisterAttribute
 * @property {string} name
 * @property {boolean} is_active
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CashRegisterAttribute} CashRegisterAttributes
 */



/**
 * @typedef {import("sequelize").Model<CashRegisterAttributes, CashRegisterAttributes> & CashRegisterAttributes} CashRegisterInstance
 * @property {Function} getRecyclery
 * @property {Function} getSessions
 */