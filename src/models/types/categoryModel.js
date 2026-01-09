/**
 * @typedef {Object} CategoryCreateAttributes
 * @property {string} name
 * @property {string} [description]
 * @property {string} [icon]
 * @property {number|null} parent_id
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CategoryCreateAttributes} CategoryAttributes
 * 
 */

/**
 * @typedef {import("sequelize").Model<CategoryAttributes, CategoryCreateAttributes> & CategoryAttributes } CategoryInstance
 * @property {Function} getSubcategories
 * @property {Function} getParent
 * @property {Function} getLabeledItems
 */
