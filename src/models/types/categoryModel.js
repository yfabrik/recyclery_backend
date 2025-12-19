/**
 * @typedef {Object} CategoryAttribute
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CategoryAttribute} CategoryAttributes
 * 
 */

/**
 * @typedef {import("sequelize").Model<CategoryAttributes, CategoryAttributes> & CategoryAttributes} CategoryInstance
 * @property {Function} getSubcategories
 * @property {Function} getParent
 * @property {Function} getLabeledItems
 */
