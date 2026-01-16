/**
 * @typedef {Object} ArrivalCreateAttributes
 * @property {number} weight
 * @property {Date} arrival_date
 * @property {Date} arrival_time
 * @property {"point"|"apport"|"house_clearance"} source_type
 * @property {string} [source_details]
 * @property {string} [notes]
 * @property {string} [status]
 * @property {number} processed_by
 * @property {number} [collection_point_id]
 * @property {number} category_id

/**
 * @typedef { import("./baseModelAttributes.js").baseAttributes & ArrivalCreateAttributes} ArrivalAttributes
 */

/**
 * @typedef {import("sequelize").Model<ArrivalAttributes, ArrivalCreateAttributes> & ArrivalAttributes} ArrivalInstance
 * @property {Function} getCategorie
 * @property {Function} getSubcategorie
 * @property {Function} getCollectionPoint
 * @property {Function} getProcessedBy
 */