/**
 * @typedef {Object} CollectionReceiptAttribute
 * @property {string} receipt_number
 * @property {string} items_collected
 * @property {number} total_weight
 * @property {string} notes
 * @property {string} signature_data
 * @property {string} status
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionReceiptAttribute} CollectionReceiptAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionReceiptAttributes, CollectionReceiptAttributes> & CollectionReceiptAttributes} CollectionReceiptInstance
 * @property {Function} getCollectionPoint
 * @property {Function} getUsers
 * @property {Function} getRecyclery
 * @property {Function} getCollectionReceipt
 */
