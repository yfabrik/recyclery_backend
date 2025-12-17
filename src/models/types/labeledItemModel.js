/**
 * @typedef {Object} LabeledItemAttributes
 * @property {number} [id]
 * @property {string} barcode
 * @property {string} name
 * @property {string} description
 * @property {number} weight
 * @property {number} price
 * @property {number} cost
 * @property {string} condition_state
 * @property {string} location
 * @property {string} status
 * @property {Date} sold_at
 */

/**
 * @typedef { import("sequelize").Model<LabeledItemAttributes, LabeledItemAttributes> & LabeledItemAttributes} LabeledItemInstance
 * @property {Function} getCategory
 * @property {Function} getSubcategory
 * @property {Function} getRecyclery
 * @property {Function} getSoldBy
 * @property {Function} getCreatedBy
 * @property {Function} getSalesTransaction
 */