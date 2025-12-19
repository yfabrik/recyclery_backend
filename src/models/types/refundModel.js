/**
 * @typedef {Object} RefundAttribute
 * @property {string} reason
 * @property {number} refund_amount
 * @property {string} notes
 * @property {"pending"|"completed"|"cancelled"} status
 * @property {"full"|"partial"} refund_type
 * @property {"cash"|"card"|"check"} refund_method
 * @typedef { import("./baseModelAttributes.js").baseAttributes & RefundAttribute} RefundAttributes
 */

/**
 * @typedef {import("sequelize").Model<RefundAttributes, RefundAttributes> & RefundAttributes} RefundInstance
 * @property {Function} getCreatedBy
 * @property {Function} getSalesTransaction
 */