/**
 * @typedef {Object} CashSessionCreateAttributes
 * @property {number} opening_amount - Opening cash amount in decimal format (required)
 * @property {number|null} [closing_amount] - Closing cash amount in decimal format
 * @property {number|null} [expected_amount] - Expected cash amount in decimal format (computed field)
 * @property {"open"|"close"} [status] - Status of the cash session (default: "open")
 * @property {string|null} [notes] - Additional notes about the session
 * @property {Date|string|null} [closed_at] - Date and time when the session was closed
 * @property {number} cash_register_id - Foreign key reference to the CashRegister (required)
 * @property {number} user_id - Foreign key reference to the User who opened the session (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CashSessionCreateAttributes} CashSessionAttributes
 * @property {number} difference_amount - Virtual property: difference between closing_amount and expected_amount (computed, read-only)
 */

/**
 * @typedef {import("sequelize").Model<CashSessionAttributes, CashSessionCreateAttributes> & CashSessionAttributes} CashSessionInstance
 * 
 * @property {() => Promise<import("./cashRegisterModel.js").CashRegisterInstance>} getCashRegister - Get the associated CashRegister (belongs-to relationship).
 * 
 * @property {(cashRegister: import("./cashRegisterModel.js").CashRegisterInstance|number) => Promise<void>} setCashRegister - Set the CashRegister for this session. Takes a CashRegister instance or cash register ID.
 * 
 * @property {() => Promise<Array<import("./salesTransactionModel.js").SalesTransactionInstance>>} getSalesTransactions - Get all sales transactions associated with this cash session (has-many relationship through cash_session_id foreign key).
 * 
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} setSalesTransactions - Replace all sales transactions associated with this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 * 
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} addSalesTransactions - Add one or more sales transactions to this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 * 
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} removeSalesTransactions - Remove one or more sales transactions from this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance>} getUser - Get the User who opened this cash session (belongs-to relationship).
 * 
 * @property {(user: import("./userModel.js").UserInstance|number) => Promise<void>} setUser - Set the User who opened this cash session. Takes a User instance or user ID.
 */