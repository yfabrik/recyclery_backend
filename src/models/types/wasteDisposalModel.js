/**
 * @typedef {Object} WasteDisposalAttribute
 * @property {number} [id]
 * @property {string} disposal_number
 * @property {Date} disposal_date
 * @property {"eco_organism"|"landfill"|"recycling"|"other"} disposal_type
 * @property {number} weight_kg
 * @property {number} [volume_m3]
 * @property {string} [transport_method]
 * @property {string} [transport_company]
 * @property {number} [transport_cost]
 * @property {string} [notes]
 * @typedef { import("./baseModelAttributes.js").baseAttributes & WasteDisposalAttribute} WasteDisposalAttributes
 */

/**
 * @typedef {import("sequelize").Model<WasteDisposalAttributes, WasteDisposalAttributes> & WasteDisposalAttributes} WasteDisposalInstance
 * @property {Function} getCategory
 * @property {Function} getSubcategory
 * @property {Function} getEcoOrganism
 * @property {Function} getCreatedBy
 */