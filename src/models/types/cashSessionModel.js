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
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} CashSessionRow
 * @property {number} opening_amount
 * @property {number|null} closing_amount
 * @property {number|null} expected_amount
 * @property {"open"|"close"} status
 * @property {string|null} notes
 * @property {Date|string|null} closed_at
 * @property {number} cash_register_id
 * @property {number} user_id
 * @property {number} [difference_amount] - Virtual
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &CashSessionRow} CashSessionAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} CashSessionInstanceAssociations
 * @property {import("./cashRegisterModel.js").CashRegisterInstance} [CashRegister] - Set when included (e.g. include: [CashRegister])
 * @property {Array<import("./salesTransactionModel.js").SalesTransactionInstance>} [SalesTransactions] - Set when included
 * @property {import("./userModel.js").UserInstance} [User] - Set when included (user_id)
 *
 * @property {() => Promise<import("./cashRegisterModel.js").CashRegisterInstance|null>} getCashRegister - Get the associated CashRegister (belongs-to relationship). Returns null if not set.
 *
 * @property {(cashRegister: import("./cashRegisterModel.js").CashRegisterInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setCashRegister - Set or unset the CashRegister for this session. Takes a CashRegister instance, cash register ID, or null to remove the association.
 *
 * @property {() => Promise<Array<import("./salesTransactionModel.js").SalesTransactionInstance>>} getSalesTransactions - Get all sales transactions associated with this cash session (has-many relationship through cash_session_id foreign key).
 *
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} setSalesTransactions - Replace all sales transactions associated with this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 *
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} addSalesTransactions - Add one or more sales transactions to this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 *
 * @property {(transactions: Array<import("./salesTransactionModel.js").SalesTransactionInstance|number>) => Promise<void>} removeSalesTransactions - Remove one or more sales transactions from this cash session. Takes an array of SalesTransaction instances or transaction IDs.
 *
 * @property {(values?: import("./salesTransactionModel.js").SalesTransactionCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./salesTransactionModel.js").SalesTransactionInstance>} createSalesTransaction - Create a new sales transaction for this cash session (has-many).
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getUser - Get the User who opened this cash session (belongs-to relationship). Returns null if not set.
 *
 * @property {(user: import("./userModel.js").UserInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setUser - Set or unset the User who opened this cash session. Takes a User instance, user ID, or null to remove the association.
 */

/**
 * @typedef {import("sequelize").Model<CashSessionAttributes, CashSessionCreateAttributes> & CashSessionAttributes & CashSessionInstanceAssociations} CashSessionInstance
 */
