/**
 * @typedef {Object} CollectionScheduleAttributes
 * @property {number} [id]
 * @property {Date} scheduled_date
 * @property {string} scheduled_time
 * @property {string} vehicle
 * @property {string} status
 * @property {number} estimated_duration
 * @property {string} notes
 * @property {string} address
 * @property {string} contact_name
 * @property {string} contact_phone
 */

/**
 * @typedef {import("sequelize").Model<CollectionScheduleAttributes, CollectionScheduleAttributes> & CollectionScheduleAttributes} CollectionScheduleInstance
 * @property {Function} getCollectionPoint
 * @property {Function} getUsers
 * @property {Function} getRecyclery
 * @property {Function} getCollectionReceipt
 */