/**
 * @typedef {Object} DonationCreateAttributes
 * @property {string} donor_name - Name of the donor
 * @property {string|null} [donor_phone] - Phone number of the donor
 * @property {string|null} [donor_email] - Email address of the donor
 * @property {string} item_description - Description of the donated items
 * @property {number} [estimated_value] - Estimated monetary value of the donation
 * @property {"pending"| "accepted"| "rejected"} [status] - Status of the donation (default: "pending")
 * @property {Date|string} [received_at] - Date and time when the donation was received
 * @property {number|null} [recyclery_id] - Foreign key reference to the associated Recyclery
 * @property {number|null} [received_by] - Foreign key reference to the User who received the donation
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & DonationCreateAttributes} DonationAttributes
 */

/**
 * @typedef {import("sequelize").Model<DonationAttributes, DonationCreateAttributes> & DonationAttributes} DonationInstance
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this donation. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getReceivedBy - Get the User who received this donation (belongs-to relationship). Returns null if no user is associated.
 * 
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setReceivedBy - Set or unset the User who received this donation. Takes a User instance, user ID, or null to remove the association.
 */
