/**
 * @typedef {Object} RecycleryCreateAttribute
 * @property {string} name
 * @property {string} [address]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [city]
 * @property {string} [postal_code]
 * @property {boolean} is_active
 * @property {number} [manager_id]
 * @typedef { import("./baseModelAttributes.js").baseAttributes & RecycleryCreateAttribute} RecycleryAttributes
 */

/**
 * @typedef {import("sequelize").Model <RecycleryAttributes, RecycleryCreateAttribute> & RecycleryAttributes} RecycleryInstance
 * @property {Function} getLabeledItems
 * @property {Function} getDonations
 * @property {Function} getCollectionSchedules
 * @property {Function} getHoraires
 * @property {Function} getEmployees
 * @property {Function} getManager
 * @property {Function} getCaisses
 */