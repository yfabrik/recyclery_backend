/**
 * @typedef {Object} CashRegisterCreateAttributes
 * @property {string} name
 * @property {boolean} is_active
 * @property {number} recyclery_id
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CashRegisterCreateAttributes} CashRegisterAttributes
 */



/**
 * @typedef {import("sequelize").Model<CashRegisterAttributes,CashRegisterCreateAttributes> & CashRegisterAttributes} CashRegisterInstance
 * @property {Function} getRecyclery
 * @property {Function} getSessions
 */