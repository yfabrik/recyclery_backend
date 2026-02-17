/**
 * @typedef {Object} ArrivalCreateAttributes
 * @property {number} weight - Weight of the arrival in decimal format (required)
 * @property {Date|string|null} [arrival_date] - Date of arrival (defaults to current date)
 * @property {string|null} [arrival_time] - Time of arrival in "HH:mm:ss" format (TIME type)
 * @property {"point"|"apport"|"house_clearance"|null} [source_type] - Type of source for the arrival
 * @property {string|null} [source_details] - Additional details about the source
 * @property {string|null} [notes] - Additional notes about the arrival
 * @property {"received"|string|null} [status] - Status of the arrival (default: "received")
 * @property {number|null} [processed_by] - Foreign key reference to the User who processed this arrival
 * @property {number|null} [collection_point_id] - Foreign key reference to the CollectionPoint
 * @property {number|null} [category_id] - Foreign key reference to the Category
 * @property {number|null} [subcategory_id] - Foreign key reference to the subcategory Category
 */

/**
 * @typedef { import("./baseModelAttributes.js").baseAttributes & ArrivalCreateAttributes} ArrivalAttributes
 */

/**
 * @typedef {import("sequelize").Model<ArrivalAttributes, ArrivalCreateAttributes> & ArrivalAttributes} ArrivalInstance
 *
 * @property {import("./categoryModel.js").CategoryInstance} [categorie] - Associated Category when loaded with include (alias "categorie")
 * @property {import("./categoryModel.js").CategoryInstance} [subcategorie] - Associated subcategory Category when loaded with include (alias "subcategorie")
 * @property {import("./collectionPointModel.js").CollectionPointInstance} [CollectionPoint] - Associated CollectionPoint when loaded with include
 * @property {import("./userModel.js").UserInstance} [User] - User who processed this arrival when loaded with include (processed_by)
 *
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance>} getCategorie - Get the associated Category (belongs-to relationship). Uses "categorie" alias.
 *
 * @property {(category: import("./categoryModel.js").CategoryInstance|number) => Promise<void>} setCategorie - Set the Category for this arrival. Takes a Category instance or category ID.
 *
 * @property {() => Promise<import("./categoryModel.js").CategoryInstance|null>} getSubcategorie - Get the associated subcategory Category (belongs-to relationship). Returns null if no subcategory is assigned. Uses "subcategorie" alias.
 *
 * @property {(subcategory: import("./categoryModel.js").CategoryInstance|number|null) => Promise<void>} setSubcategorie - Set or unset the subcategory Category for this arrival. Takes a Category instance, category ID, or null to remove the subcategory.
 *
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance|null>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship). Returns null if no collection point is associated.
 *
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number|null) => Promise<void>} setCollectionPoint - Set or unset the CollectionPoint for this arrival. Takes a CollectionPoint instance, collection point ID, or null to remove the association.
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getProcessedBy - Get the User who processed this arrival (belongs-to relationship). Returns null if not set.
 *
 * @property {(user: import("./userModel.js").UserInstance|number|null) => Promise<void>} setProcessedBy - Set or unset the User who processed this arrival. Takes a User instance, user ID, or null to remove the association.
 */
