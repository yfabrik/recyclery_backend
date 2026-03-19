/**
 * @typedef {Object} GiftCardCreateAttributes
 * @property {string} code
 * @property {number|string} initial_value
 * @property {Date|string|null} [expires_at]
 * @property {"active"|"partially_used"|"redeemed"|"expired"|"cancelled"} [status]
 * @property {string} [currency]
 * @property {Date|string} [issued_at]
 * @property {number|null} [issued_transaction_id]
 * @property {number|null} [issued_refund_transaction_id]
 * @property {number|null} [created_by]
 * @property {string|null} [note]
 * @property {string|null} [recipient_name]
 * @property {string|null} [recipient_email]
 */

/**
 * @typedef {Object} GiftCardRow
 * @property {string} code
 * @property {number|string} initial_value
 * @property {Date|string|null} expires_at
 * @property {"active"|"partially_used"|"redeemed"|"expired"|"cancelled"} status
 * @property {string} currency
 * @property {Date|string} issued_at
 * @property {number|null} issued_transaction_id
 * @property {number|null} issued_refund_transaction_id
 * @property {number|null} created_by
 * @property {string|null} note
 * @property {string|null} recipient_name
 * @property {string|null} recipient_email
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes & GiftCardRow} GiftCardAttributes */

/**
 * @typedef {Object} GiftCardInstanceAssociations
 * @property {import("./salesTransactionModel.js").SalesTransactionInstance} [issuedTransaction]
 * @property {import("./salesTransactionModel.js").SalesTransactionInstance} [issuedRefundTransaction]
 * @property {import("./userModel.js").UserInstance} [createdBy]
 * @property {Array<import("./salesTransactionModel.js").SalesTransactionInstance>} [transactions]
 */

/**
 * @typedef {import("sequelize").Model<GiftCardAttributes, GiftCardCreateAttributes> & GiftCardAttributes & GiftCardInstanceAssociations} GiftCardInstance
 */
