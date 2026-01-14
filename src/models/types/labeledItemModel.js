/**
 * @typedef {Object} LabeledItemCreateAttributes
 * @property {string} [barcode] - Unique barcode identifier for the item
 * @property {string} name - Name of the labeled item
 * @property {string} [description] - Detailed description of the item
 * @property {number|string} [weight] - Weight of the item (DECIMAL type)
 * @property {number|string} price - Selling price of the item (DECIMAL type)
 * @property {number|string} [cost] - Cost/purchase price of the item (DECIMAL type)
 * @property {string} [condition_state] - Condition of the item (default: "good")
 * @property {string} [location] - Physical location where the item is stored
 * @property {string} [status] - Current status of the item (default: "available", e.g., "available", "sold", "reserved")
 * @property {Date|string} [sold_at] - Date and time when the item was sold
 * @property {number|null} [category_id] - Foreign key reference to the primary Category
 * @property {number|null} [subcategory_id] - Foreign key reference to the subcategory Category
 * @property {number|null} [recyclery_id] - Foreign key reference to the associated Recyclery
 * @property {number|null} [created_by] - Foreign key reference to the User who created the item
 * @property {number|null} [sold_by] - Foreign key reference to the User who sold the item
 * @property {number|null} [transaction_id] - Foreign key reference to the SalesTransaction if sold
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & LabeledItemCreateAttributes} LabeledItemAttributes
 */

/**
 * @typedef {import("sequelize").Model<LabeledItemAttributes, LabeledItemCreateAttributes> & LabeledItemAttributes} LabeledItemInstance
 * 
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance|null>} getCategory - Get the primary category (belongs-to relationship). Returns null if no category is associated. Uses "category" alias.
 * 
 * @property {(category: import("./categoryModel.js").CategoryInstance|number|null) => Promise<void>} setCategory - Set or unset the primary category. Takes a Category instance, category ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance|null>} getSubcategory - Get the subcategory (belongs-to relationship). Returns null if no subcategory is associated. Uses "subcategory" alias.
 * 
 * @property {(subcategory: import("./categoryModel.js").CategoryInstance|number|null) => Promise<void>} setSubcategory - Set or unset the subcategory. Takes a Category instance, category ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated. Uses "recyclery" alias.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this item. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getSoldBy - Get the User who sold this item (belongs-to relationship). Returns null if no user is associated. Uses "soldBy" alias.
 * 
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setSoldBy - Set or unset the User who sold this item. Takes a User instance, user ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getCreatedBy - Get the User who created this item (belongs-to relationship). Returns null if no user is associated. Uses "createdBy" alias.
 * 
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setCreatedBy - Set or unset the User who created this item. Takes a User instance, user ID, or null to remove the association.
 * 
 * @property {() => Promise<import("./salesTransactionModel.js").SalesTransactionInstance|null>} getSalesTransaction - Get the associated SalesTransaction if the item was sold (belongs-to relationship). Returns null if not sold or no transaction is associated.
 * 
 * @property {(transaction: import("./salesTransactionModel.js").SalesTransactionInstance|number|null) => Promise<void>} setSalesTransaction - Set or unset the SalesTransaction for this item. Takes a SalesTransaction instance, transaction ID, or null to remove the association.
 */