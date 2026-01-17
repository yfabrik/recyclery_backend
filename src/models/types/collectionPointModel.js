/**
 * @typedef {Object} CollectionPointCreateAttributes
 * @property {string} name
 * @property {string} address
 * @property {string} city
 * @property {string} postal_code
 * @property {string} [contact_person]
 * @property {string} [contact_phone]
 * @property {string} [contact_email]
 * @property {"standard"| "entreprise"| "association"| "school"| "hospital"| "other"} [type]
 * @property {string} [notes]
 * @property {boolean} [is_active]
 * @property {number} [recyclery_id]
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionPointCreateAttributes} CollectionPointAttributes
 * 
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointAttributes, CollectionPointCreateAttributes> & CollectionPointAttributes} CollectionPointInstance
 * @property {Function} getRecyclery
 * @property {Function} getCollectionSchedules
 * @property {Function} getArrivals
 */