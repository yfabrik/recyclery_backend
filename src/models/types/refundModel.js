/**
 * @typedef {Object} RefundCreateAttributes
 * @property {string|null} [reason] - Reason for the refund
 * @property {number|string|null} [refund_amount] - Refund amount (DECIMAL)
 * @property {string|null} [notes] - Additional notes
 * @property {"pending"|"completed"|"cancelled"|null} [status] - Status (default: "completed")
 * @property {"full"|"partial"|null} [refund_type] - Type of refund
 * @property {"cash"|"card"|"check"|null} [refund_method] - Refund method
 * @property {number|null} [created_by] - Foreign key reference to the User who created the refund
 * @property {number|null} [transaction_id] - Foreign key reference to the SalesTransaction
 */

/**
 * Fetched row: all attributes present (no undefined).
 * @typedef {Object} RefundRow

 * @property {string|null} reason
 * @property {number|string|null} refund_amount
 * @property {string|null} notes
 * @property {"pending"|"completed"|"cancelled"} status
 * @property {"full"|"partial"|null} refund_type
 * @property {"cash"|"card"|"check"|null} refund_method
 * @property {number|null} created_by
 * @property {number|null} transaction_id
 */

/** @typedef {import("./baseModelAttributes.js").baseAttributes &RefundRow} RefundAttributes */

/**
 * @typedef {import("sequelize").Model<RefundAttributes, RefundCreateAttributes> & RefundAttributes} RefundInstance
 *
 * @property {import("./userModel.js").UserInstance} [User] - User who created the refund when loaded with include (created_by)
 * @property {import("./salesTransactionModel.js").SalesTransactionInstance} [SalesTransaction] - Sales transaction when loaded with include
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getCreatedBy - Get the User who created this refund (belongs-to relationship). Returns null if not set.
 *
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setCreatedBy - Set or unset the User who created this refund. Takes a User instance, user ID, or null to remove the association.
 *
 * @property {() => Promise<import("./salesTransactionModel.js").SalesTransactionInstance|null>} getSalesTransaction - Get the associated SalesTransaction (belongs-to relationship). Returns null if not set.
 *
 * @property {(transaction: import("./salesTransactionModel.js").SalesTransactionInstance|number|null) => Promise<void>} setSalesTransaction - Set or unset the SalesTransaction for this refund. Takes a SalesTransaction instance, transaction ID, or null to remove the association.
 */
