/**
 * @typedef {Object} CollectionScheduleAttribute
 * @property {Date} scheduled_date
 * @property {string} scheduled_time
 * @property {string} vehicle
 * @property {string} status
 * @property {number} estimated_duration
 * @property {string} notes
 * @property {string} address
 * @property {string} contact_name
 * @property {string} contact_phone
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionScheduleAttribute} CollectionScheduleAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionScheduleAttributes, CollectionScheduleAttributes> & CollectionScheduleAttributes} CollectionScheduleInstance
 * @property {Function} getCollectionPoint
 * @property {Function} getUsers
 * @property {Function} getRecyclery
 * @property {Function} getCollectionReceipt
 */