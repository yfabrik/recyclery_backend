/**
 * @typedef {Object} ArrivalAttribute
 * @property {string} arrival_number
 * @property {number} weight
 * @property {Date} arrival_date
 * @property {string} arrival_time
 * @property {string} source_type
 * @property {string} source_details
 * @property {boolean} volunteer_donation
 * @property {boolean} house_clearance
 * @property {string} notes
 * @property {string} status
 */

/**
 * @typedef { import("./baseModelAttributes.js").baseAttributes & ArrivalAttribute} ArrivalAttributes
 */

/**
 * @typedef {import("sequelize").Model<ArrivalAttributes, ArrivalAttributes> & ArrivalAttributes} ArrivalInstance
 * @property {Function} getCategorie
 * @property {Function} getSubcategorie
 * @property {Function} getCollectionPoint
 * @property {Function} getProcessedBy
 */