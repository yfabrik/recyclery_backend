/**
 * @typedef {Object} EcoOrganismCreateAttributes
 * @property {string} name - Name of the eco-organism
 * @property {string|null} [description] - Description of the eco-organism
 * @property {string|null} [contact_email] - Contact email address
 * @property {string|null} [contact_phone] - Contact phone number
 * @property {string|null} [address] - Physical address of the eco-organism
 * @property {string|null} [website] - Website URL of the eco-organism
 * @property {boolean} [is_active] - Whether the eco-organism is currently active
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EcoOrganismCreateAttributes} EcoOrganismAttributes
 */

/**
 * @typedef {import("sequelize").Model<EcoOrganismAttributes, EcoOrganismCreateAttributes> & EcoOrganismAttributes} EcoOrganismInstance
 */
