/**
 * @typedef {Object} RecycleryAttribute
 * @property {string} name
 * @property {string} address
 * @property {string} phone
 * @property {string} email
 * @property {string} city
 * @property {string} postal_code
 * @property {boolean} is_active
 * @typedef { import("./baseModelAttributes.js").baseAttributes & RecycleryAttribute} RecycleryAttributes
 */

/**
 * @typedef {import("sequelize").Model <RecycleryAttributes, RecycleryAttributes> & RecycleryAttributes} RecycleryInstance
 * @property {Function} getLabeledItems
 * @property {Function} getDonations
 * @property {Function} getCollectionSchedules
 * @property {Function} getHoraires
 * @property {Function} getEmployees
 * @property {Function} getManager
 * @property {Function} getCaisses
 */