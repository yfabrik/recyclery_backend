/**
 * @typedef {Object} EcoOrganismCreateAttributes
 * @property {string} name - Name of the eco-organism (required)
 * @property {string|null} [description] - Description of the eco-organism
 * @property {string|null} [contact_email] - Contact email address
 * @property {string|null} [contact_phone] - Contact phone number
 * @property {string|null} [address] - Physical address of the eco-organism
 * @property {string|null} [website] - Website URL of the eco-organism
 * @property {boolean} [is_active] - Whether the eco-organism is currently active (default: true)
 */

/**
 * Fetched row: all attributes present (no undefined).
 * @typedef {Object} EcoOrganismRow
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} contact_email
 * @property {string|null} contact_phone
 * @property {string|null} address
 * @property {string|null} website
 * @property {boolean} is_active
 */

/** @typedef {import("./baseModelAttributes.js").baseAttributes &EcoOrganismRow} EcoOrganismAttributes */

/**
 * @typedef {import("sequelize").Model<EcoOrganismAttributes, EcoOrganismCreateAttributes> & EcoOrganismAttributes} EcoOrganismInstance
 *
 * @property {Array<import("./wasteDisposalModel.js").WasteDisposalInstance>} [WasteDisposals] - Waste disposals when loaded with include
 *
 * @property {() => Promise<Array<import("./wasteDisposalModel.js").WasteDisposalInstance>>} getWasteDisposals - Get all waste disposals associated with this eco-organism (has-many relationship).
 *
 * @property {(wasteDisposals: Array<import("./wasteDisposalModel.js").WasteDisposalInstance|number>) => Promise<void>} setWasteDisposals - Replace all waste disposals associated with this eco-organism. Takes an array of WasteDisposal instances or IDs.
 *
 * @property {(wasteDisposal: import("./wasteDisposalModel.js").WasteDisposalInstance|number) => Promise<void>} addWasteDisposal - Add a waste disposal to this eco-organism.
 *
 * @property {(wasteDisposals: Array<import("./wasteDisposalModel.js").WasteDisposalInstance|number>) => Promise<void>} addWasteDisposals - Add one or more waste disposals to this eco-organism.
 *
 * @property {(wasteDisposal: import("./wasteDisposalModel.js").WasteDisposalInstance|number) => Promise<void>} removeWasteDisposal - Remove a waste disposal from this eco-organism.
 *
 * @property {(wasteDisposals: Array<import("./wasteDisposalModel.js").WasteDisposalInstance|number>) => Promise<void>} removeWasteDisposals - Remove one or more waste disposals from this eco-organism.
 *
 * @property {(values?: import("./wasteDisposalModel.js").WasteDisposalCreateAttributes) => Promise<import("./wasteDisposalModel.js").WasteDisposalInstance>} createWasteDisposal - Create a new waste disposal for this eco-organism (has-many).
 */
