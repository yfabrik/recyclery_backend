/**
 * @typedef {Object} CollectionPointPresenceAttribute
 * @property {string} day_of_week
 * @property {string} time_slot_name
 * @property {boolean} is_present
 * @property {Date} start_time
 * @property {Date} end_time
 * @property {boolean} is_24h
 * @property {string} notes
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionPointPresenceAttribute} CollectionPointPresenceAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointPresenceAttributes, CollectionPointPresenceAttributes> & CollectionPointPresenceAttributes} CollectionPointPresenceInstance
 * @property {Function} getCollectionPoint
 * @property {Function} getUsers
 * @property {Function} getRecyclery
 * @property {Function} getCollectionReceipt
 */