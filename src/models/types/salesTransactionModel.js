/**
 * @typedef {Object} SalesTransactionCreateAttributes
 * @property {number|string} [total_amount] - Total amount of the transaction in decimal format
 * @property {"cash"|"card"|"check"} [payment_method] - Payment method used for the transaction
 * @property {"sell"|"refund"} [transactionType] - Type of transaction (default: "sell")
 * @property {number|string} [payment_amount] - Amount paid by the customer in decimal format
 * @property {string|null} [customer_name] - Name of the customer
 * @property {string|null} [customer_email] - Email address of the customer
 * @property {string|null} [customer_postal_code] - Postal code of the customer
 * @property {"pending"|"completed"|"cancelled"} [status] - Status of the transaction (default: "completed")
 * @property {number} [cash_session_id] - Foreign key reference to the CashSession
 * @property {number} [created_by] - Foreign key reference to the User who created the transaction
 *
 * @typedef { import("./baseModelAttributes.js").baseAttributes & SalesTransactionCreateAttributes} SalesTransactionAttributes
 * @property {number} [change_amount] - Virtual property: change amount computed from payment_amount - total_amount (read-only)
 */

/**
 * @typedef {import("sequelize").Model<SalesTransactionAttributes, SalesTransactionCreateAttributes> & SalesTransactionAttributes} SalesTransactionInstance
 *
 * @property {Array<any>} [SalesItems] - Sales items when loaded with include
 * @property {Array<import("./labeledItemModel.js").LabeledItemInstance>} [LabeledItems] - Labeled items when loaded with include
 * @property {import("./userModel.js").UserInstance} [User] - User who created the transaction when loaded with include (created_by)
 * @property {import("./cashSessionModel.js").CashSessionInstance} [CashSession] - Cash session when loaded with include
 *
 * @property {() => Promise<Array<any>>} getSalesItems - Get all sales items associated with this transaction (has-many relationship through transaction_id foreign key).
 *
 * @property {(items: Array<any|number>) => Promise<void>} setSalesItems - Replace all sales items associated with this transaction. Takes an array of SalesItem instances or item IDs.
 *
 * @property {(items: Array<any|number>) => Promise<void>} addSalesItems - Add one or more sales items to this transaction. Takes an array of SalesItem instances or item IDs.
 *
 * @property {(items: Array<any|number>) => Promise<void>} removeSalesItems - Remove one or more sales items from this transaction. Takes an array of SalesItem instances or item IDs.
 *
 * @property {(values?: object) => Promise<any>} createSalesItem - Create a new sales item for this transaction (has-many).
 *
 * @property {() => Promise<import("./cashSessionModel.js").CashSessionInstance|null>} getCashSession - Get the associated CashSession (belongs-to relationship). Returns null if not set.
 *
 * @property {(cashSession: import("./cashSessionModel.js").CashSessionInstance|number|null) => Promise<void>} setCashSession - Set or unset the CashSession for this transaction. Takes a CashSession instance, session ID, or null to remove the association.
 *
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items associated with this transaction (has-many relationship through transaction_id foreign key).
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} setLabeledItems - Replace all labeled items associated with this transaction. Takes an array of LabeledItem instances or item IDs.
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} addLabeledItems - Add one or more labeled items to this transaction. Takes an array of LabeledItem instances or item IDs.
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} removeLabeledItems - Remove one or more labeled items from this transaction. Takes an array of LabeledItem instances or item IDs.
 *
 * @property {(values?: import("./labeledItemModel.js").LabeledItemCreateAttributes) => Promise<import("./labeledItemModel.js").LabeledItemInstance>} createLabeledItem - Create a new labeled item for this transaction (has-many).
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getCreatedBy - Get the User who created this transaction (belongs-to relationship). Returns null if not set.
 *
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setCreatedBy - Set or unset the User who created this transaction. Takes a User instance, user ID, or null to remove the association.
 */
