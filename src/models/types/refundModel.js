/**
 * @typedef {Object} RefundAttributes
 * @property {number} [id]
 * @property {string} reason
 * @property {number} refund_amount
 * @property {string} notes
 * @property {"pending"|"completed"|"cancelled"} status
 * @property {"full"|"partial"} refund_type
 * @property {"cash"|"card"|"check"} refund_method
 */

/**
 * @typedef {import("sequelize").Model<RefundAttributes, RefundAttributes> & RefundAttributes} RefundInstance
 * @property {Function} getCreatedBy
 * @property {Function} getSalesTransaction
 */