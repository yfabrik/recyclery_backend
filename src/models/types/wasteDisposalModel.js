/**
 * @typedef {Object} WasteDisposalCreateAttributes
 * @property {Date|string} disposal_date - Date when the waste was disposed (required)
 * @property {"eco_organism"|"landfill"|"recycling"|"other"} disposal_type - Type of disposal method (required)
 * @property {number} weight_kg - Weight of the waste in kilograms (required)
 * @property {number|null} [volume_m3] - Volume of the waste in cubic meters
 * @property {string|null} [transport_method] - Method of transport used
 * @property {string|null} [transport_company] - Company that handled the transport
 * @property {number|null} [transport_cost] - Cost of transport in decimal format
 * @property {string|null} [notes] - Additional notes about the disposal
 * @property {number|null} [category_id] - Foreign key reference to the Category
 * @property {number|null} [subcategory_id] - Foreign key reference to the subcategory Category
 * @property {number|null} [eco_organism_id] - Foreign key reference to the EcoOrganism
 * @property {number|null} [created_by] - Foreign key reference to the User who created this disposal record
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & WasteDisposalCreateAttributes} WasteDisposalAttributes
 */

/**
 * @typedef {import("sequelize").Model<WasteDisposalAttributes, WasteDisposalCreateAttributes> & WasteDisposalAttributes} WasteDisposalInstance
 * 
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance|null>} getCategory - Get the associated Category (belongs-to relationship). Returns null if no category is associated. Uses "category" alias.
 * 
 * @property {(category: import("./categoryModel.js").CategoryInstance|number|null) => Promise<void>} setCategory - Set or unset the Category for this waste disposal. Takes a Category instance, category ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance|null>} getSubcategory - Get the associated subcategory Category (belongs-to relationship). Returns null if no subcategory is associated. Uses "subcategory" alias.
 * 
 * @property {(subcategory: import("./categoryModel.js").CategoryInstance|number|null) => Promise<void>} setSubcategory - Set or unset the subcategory Category for this waste disposal. Takes a Category instance, category ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./ecoOrganismModel.js").EcoOrganismInstance|null>} getEcoOrganism - Get the associated EcoOrganism (belongs-to relationship). Returns null if no eco-organism is associated. Uses "eco_organism" alias.
 * 
 * @property {(ecoOrganism: import("./ecoOrganismModel.js").EcoOrganismInstance|number|null) => Promise<void>} setEcoOrganism - Set or unset the EcoOrganism for this waste disposal. Takes an EcoOrganism instance, eco-organism ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getCreatedBy - Get the User who created this waste disposal record (belongs-to relationship). Returns null if no user is associated.
 * 
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setCreatedBy - Set or unset the User who created this waste disposal record. Takes a User instance, user ID, or null to remove the association.
 */