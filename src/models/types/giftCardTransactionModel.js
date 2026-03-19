/**
 * @typedef {Object} GiftCardTransactionCreateAttributes
 * @property {number} gift_card_id
 * @property {number} sales_transaction_id
 * @property {"issue"|"charge"|"refund_recredit"|"manual_adjustment"|"expire"} type
 * @property {number|string} amount
 * @property {Date|string} [occurred_at]
 * @property {number|null} [created_by]
 * @property {object|null} [metadata]
 */

/**
 * @typedef {Object} GiftCardTransactionRow
 * @property {number} gift_card_id
 * @property {number} sales_transaction_id
 * @property {"issue"|"charge"|"refund_recredit"|"manual_adjustment"|"expire"} type
 * @property {number|string} amount
 * @property {Date|string} occurred_at
 * @property {number|null} created_by
 * @property {object|null} metadata
 */

/**
 * @typedef { import("./baseModelAttributes.js").baseAttributes & GiftCardTransactionRow} GiftCardTransactionAttributes
 */

/**
 * @typedef {Object} GiftCardTransactionInstanceAssociations
 * @property {import("./giftCardModel.js").GiftCardInstance} [GiftCard]
 * @property {import("./salesTransactionModel.js").SalesTransactionInstance} [SalesTransaction]
 * @property {import("./userModel.js").UserInstance} [createdBy]
 */

/**
 * @typedef {import("sequelize").Model<GiftCardTransactionAttributes, GiftCardTransactionCreateAttributes> & GiftCardTransactionAttributes & GiftCardTransactionInstanceAssociations} GiftCardTransactionInstance
 */
