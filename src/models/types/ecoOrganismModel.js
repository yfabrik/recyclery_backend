/**
 * @typedef {Object} EcoOrganismAttribute

 * @property {string} name
 * @property {string} description
 * @property {string} contact_email
 * @property {string} contact_phone
 * @property {number} address
 * @property {string} website
 * @property {boolean} is_active
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EcoOrganismAttribute} EcoOrganismAttributes

 */

/**
 * @typedef { import("sequelize").Model<EcoOrganismAttributes, EcoOrganismAttributes> & EcoOrganismAttributes} EcoOrganismInstance
 */
