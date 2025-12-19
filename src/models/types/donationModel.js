/**
 * @typedef {Object} DonationAttribute

 * @property {string} donor_name
 * @property {string} donor_phone
 * @property {string} donor_email
 * @property {string} item_description
 * @property {number} estimated_value
 * @property {string} status
 * @property {Date} received_at
 * @typedef { import("./baseModelAttributes.js").baseAttributes & DonationAttribute} DonationAttributes

 */

/**
 * @typedef { import("sequelize").Model<DonationAttributes, DonationAttributes> & DonationAttributes} DonationInstance
 */
