/**
 * @typedef {Object} EmployeeCreateAttributes
 * @property {string} nom
 * @property {string} prenom
 * @property {boolean} isActive
 * @property {string} email
 * @property {string} phone
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeCreateAttributes} EmployeeAttributes
 */

/**
 * @typedef { import("sequelize").Model<EmployeeAttributes, EmployeeCreateAttributes> & EmployeeAttributes} EmployeeInstance
 */
