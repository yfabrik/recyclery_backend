/**
 * @typedef {Object} CategoryAttributes
 * @property {number} [id]
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 */

/**
 * @typedef {import("sequelize").Model<CategoryAttributes, CategoryAttributes> & CategoryAttributes} CategoryInstance
 * @property {Function} getSubcategories
 * @property {Function} getParent
 * @property {Function} getLabeledItems
 */
