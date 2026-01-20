/**
 * @typedef {Object} CashRegisterCreateAttributes
 * @property {string} name - Name of the cash register (required)
 * @property {boolean} [is_active] - Whether the cash register is currently active (default: true)
 * @property {number} recyclery_id - Foreign key reference to the Recyclery (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CashRegisterCreateAttributes} CashRegisterAttributes
 */

/**
 * @typedef {import("sequelize").Model<CashRegisterAttributes, CashRegisterCreateAttributes> & CashRegisterAttributes} CashRegisterInstance
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the recyclery/store associated with this cash register (belongs-to relationship). Returns null if no recyclery is assigned.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the recyclery/store for this cash register. Takes a Recyclery instance, recyclery ID, or null to remove the recyclery.
 * 
 * @property {() => Promise<Array<import("./cashSessionModel.js").CashSessionInstance>>} getSessions - Get all cash sessions for this cash register (has-many relationship). Uses "sessions" alias. CASCADE delete enabled.
 * 
 * @property {(sessions: Array<import("./cashSessionModel.js").CashSessionInstance|number>) => Promise<void>} setSessions - Replace all cash sessions for this cash register. Takes an array of CashSession instances or session IDs.
 * 
 * @property {(sessions: Array<import("./cashSessionModel.js").CashSessionInstance|number>) => Promise<void>} addSessions - Add one or more cash sessions to this cash register. Takes an array of CashSession instances or session IDs.
 * 
 * @property {(sessions: Array<import("./cashSessionModel.js").CashSessionInstance|number>) => Promise<void>} removeSessions - Remove one or more cash sessions from this cash register. Takes an array of CashSession instances or session IDs.
 */