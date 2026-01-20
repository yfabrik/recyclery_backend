/**
 * @typedef {Object} SalesTransactionCreateAttributes
 * @property {number|null} [total_amount] - Total amount of the transaction in decimal format
 * @property {"cash"|"card"|"check"} payment_method - Payment method used for the transaction (required)
 * @property {"sell"|"refund"} [transactionType] - Type of transaction (default: "sell")
 * @property {number} payment_amount - Amount paid by the customer in decimal format (required)
 * @property {string|null} [customer_name] - Name of the customer
 * @property {string|null} [customer_email] - Email address of the customer
 * @property {string|null} [customer_postal_code] - Postal code of the customer
 * @property {"pending"|"completed"|"cancelled"} [status] - Status of the transaction (default: "completed")
 * @property {number} cash_session_id - Foreign key reference to the CashSession (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & SalesTransactionCreateAttributes} SalesTransactionAttributes
 * @property {number} change_amount - Virtual property: change amount computed from payment_amount - total_amount (read-only)
 */

/**
 * @typedef {import("sequelize").Model<SalesTransactionAttributes, SalesTransactionCreateAttributes> & SalesTransactionAttributes} SalesTransactionInstance
 * 
 * @property {() => Promise<Array<any>>} getSalesItems - Get all sales items associated with this transaction (has-many relationship through transaction_id foreign key).
 * 
 * @property {(items: Array<any|number>) => Promise<void>} setSalesItems - Replace all sales items associated with this transaction. Takes an array of SalesItem instances or item IDs.
 * 
 * @property {(items: Array<any|number>) => Promise<void>} addSalesItems - Add one or more sales items to this transaction. Takes an array of SalesItem instances or item IDs.
 * 
 * @property {(items: Array<any|number>) => Promise<void>} removeSalesItems - Remove one or more sales items from this transaction. Takes an array of SalesItem instances or item IDs.
 * 
 * @property {() => Promise<import("./cashSessionModel.js").CashSessionInstance>} getCashSession - Get the associated CashSession (belongs-to relationship).
 * 
 * @property {(cashSession: import("./cashSessionModel.js").CashSessionInstance|number) => Promise<void>} setCashSession - Set the CashSession for this transaction. Takes a CashSession instance or session ID.
 * 
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items associated with this transaction (has-many relationship through transaction_id foreign key).
 * 
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} setLabeledItems - Replace all labeled items associated with this transaction. Takes an array of LabeledItem instances or item IDs.
 * 
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} addLabeledItems - Add one or more labeled items to this transaction. Takes an array of LabeledItem instances or item IDs.
 * 
 * @property {(items: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} removeLabeledItems - Remove one or more labeled items from this transaction. Takes an array of LabeledItem instances or item IDs.
 */