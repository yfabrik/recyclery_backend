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
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} SalesTransactionRow
 * @property {number|string|null} total_amount
 * @property {"cash"|"card"|"check"} payment_method
 * @property {"sell"|"refund"} transactionType
 * @property {number|string|null} payment_amount
 * @property {string|null} customer_name
 * @property {string|null} customer_email
 * @property {string|null} customer_postal_code
 * @property {"pending"|"completed"|"cancelled"} status
 * @property {number} cash_session_id
 * @property {number} created_by
 * @property {number} [change_amount] - Virtual
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &SalesTransactionRow} SalesTransactionAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} SalesTransactionInstanceAssociations
 * @property {Array<any>} [items] - Transaction line items when loaded with include (table: transaction_items)
 * @property {Array<import("./labeledItemModel.js").LabeledItemInstance>} [items] - Labeled items when loaded with include (alias for belongsToMany through TransactionItem)
 * @property {Array<import("./giftCardModel.js").GiftCardInstance>} [giftCards] - Gift cards linked to this transaction through GiftCardTransaction
 * @property {Array<import("./giftCardModel.js").GiftCardInstance>} [issuedGiftCards] - Gift cards issued by this sale transaction
 * @property {Array<import("./giftCardModel.js").GiftCardInstance>} [refundIssuedGiftCards] - Gift cards issued from a refund transaction
 * @property {import("./userModel.js").UserInstance} [User] - User who created the transaction when loaded with include (created_by)
 * @property {import("./cashSessionModel.js").CashSessionInstance} [CashSession] - Cash session when loaded with include
 *
 * @property {(items: Array<any|number>) => Promise<void>} setItems - Replace all transaction line items. Takes an array of TransactionItem instances or item IDs.
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>,options?:import("sequelize").HasManyAddAssociationsMixinOptions) => Promise<void>} addItems - Add one or more transaction line items. Takes an array of TransactionItem instances or item IDs.
 * @property {(items: import("sequelize").ModelStatic<import("./labeledItemModel.js").LabeledItemInstance>|number,options?:import("sequelize").HasManyAddAssociationsMixinOptions) => Promise<void>} addItem - Add one or more transaction line items. Takes an array of TransactionItem instances or item IDs.
 * 
 * @property {(items: Array<any|number>) => Promise<void>} removeItems - Remove one or more transaction line items. Takes an array of TransactionItem instances or item IDs.
 *
 * @property {(values?: object,options?:import("sequelize").HasManyCreateAssociationMixinOptions) => Promise<any>} createItem - Create a new transaction line item for this transaction (has-many).
 *
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getItems - Get labeled items in this transaction (belongsToMany through TransactionItem, alias transactionLines).
 *
 * @property {() => Promise<import("./cashSessionModel.js").CashSessionInstance|null>} getCashSession - Get the associated CashSession (belongs-to relationship). Returns null if not set.
 *
 * @property {(cashSession: import("./cashSessionModel.js").CashSessionInstance|number|null) => Promise<void>} setCashSession - Set or unset the CashSession for this transaction. Takes a CashSession instance, session ID, or null to remove the association.
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} setTransactionLines - Replace labeled items in this transaction (through TransactionItem).
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} addTransactionLines - Add one or more labeled items to this transaction.
 *
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} removeTransactionLines - Remove one or more labeled items from this transaction.
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getCreatedBy - Get the User who created this transaction (belongs-to relationship). Returns null if not set.
 *
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setCreatedBy - Set or unset the User who created this transaction. Takes a User instance, user ID, or null to remove the association.
 */

/**
 * @typedef {import("sequelize").Model<SalesTransactionAttributes, SalesTransactionCreateAttributes> & SalesTransactionAttributes & SalesTransactionInstanceAssociations} SalesTransactionInstance
 */
