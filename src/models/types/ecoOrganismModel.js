/**
 * @typedef {Object} EcoOrganismCreateAttributes
 * @property {string} name - Name of the eco-organism
 * @property {string} [description] - Description of the eco-organism
 * @property {string} [contact_email] - Contact email address
 * @property {string} [contact_phone] - Contact phone number
 * @property {string} [address] - Physical address of the eco-organism
 * @property {string} [website] - Website URL of the eco-organism
 * @property {boolean} [is_active] - Whether the eco-organism is currently active
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EcoOrganismCreateAttributes} EcoOrganismAttributes
 */

/**
 * @typedef {import("sequelize").Model<EcoOrganismAttributes, EcoOrganismCreateAttributes> & EcoOrganismAttributes} EcoOrganismInstance
 */
