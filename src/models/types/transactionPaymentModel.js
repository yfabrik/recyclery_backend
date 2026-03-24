/**
 * @typedef {Object} TransactionPaymentCreateAttributes
 * @property {number} sales_transaction_id
 * @property {"cash"|"card"|"check"|"giftcard"} method
 * @property {number|string} amount
 * @property {number|null} [gift_card_id]
 * @property {object|null} [metadata]
 */

/**
 * @typedef {Object} TransactionPaymentRow
 * @property {number} sales_transaction_id
 * @property {"cash"|"card"|"check"|"giftcard"} method
 * @property {number|string} amount
 * @property {number|null} gift_card_id
 * @property {object|null} metadata
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes & TransactionPaymentRow} TransactionPaymentAttributes */

/**
 * @typedef {Object} TransactionPaymentInstanceAssociations
 * @property {import("./salesTransactionModel.js").SalesTransactionInstance} [SalesTransaction]
 * @property {import("./giftCardModel.js").GiftCardInstance} [GiftCard]
 */

/**
 * @typedef {import("sequelize").Model<TransactionPaymentAttributes, TransactionPaymentCreateAttributes> & TransactionPaymentAttributes & TransactionPaymentInstanceAssociations} TransactionPaymentInstance
 */
