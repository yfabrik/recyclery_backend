/**
 * @typedef {Object} CollectionPointAttributes
 * @property {number} [id]
 * @property {string} name
 * @property {string} address
 * @property {string} city
 * @property {string} postal_code
 * @property {string} contact_person
 * @property {string} contact_phone
 * @property {string} contact_email
 * @property {string} type
 * @property {string} notes
 * @property {boolean} is_active
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointAttributes, CollectionPointAttributes> & CollectionPointAttributes} CollectionPointInstance
 * @property {Function} getRecyclery
 * @property {Function} getCollectionSchedules
 * @property {Function} getArrivals
 */