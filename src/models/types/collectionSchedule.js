/**
 * @typedef {Object} CollectionScheduleCreateAttributes
 * @property {Date|string} scheduled_date - Date when the collection is scheduled
 * @property {string|null} [scheduled_time] - Scheduled time in "HH:mm:ss" format (TIME type)
 * @property {string|null} [vehicle] - Vehicle identifier or description
 * @property {string} [status] - Status of the collection schedule (default: "planned")
 * @property {number|null} [estimated_duration] - Estimated duration in minutes
 * @property {string|null} [notes] - Additional notes about the schedule
 * @property {string|null} [address] - Address for collection (if not at a defined collection point)
 * @property {string|null} [contact_name] - Name of the contact person
 * @property {string|null} [contact_phone] - Phone number of the contact person
 * @property {number|null} [collection_point_id] - Foreign key reference to the CollectionPoint
 * @property {number} recyclery_id - Foreign key reference to the Recyclery (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionScheduleCreateAttributes} CollectionScheduleAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionScheduleAttributes, CollectionScheduleCreateAttributes> & CollectionScheduleAttributes} CollectionScheduleInstance
 * 
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance|null>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship). Returns null if no collection point is associated.
 * 
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number|null) => Promise<void>} setCollectionPoint - Set or unset the CollectionPoint for this schedule. Takes a CollectionPoint instance, collection point ID, or null to remove the association.
 * 
 * @property {() => Promise<Array<import("./userModel.js").UserInstance>>} getUsers - Get all users associated with this collection schedule (many-to-many relationship through "user_schedule" table).
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} setUsers - Replace all users associated with this collection schedule. Takes an array of User instances or user IDs.
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} addUsers - Add one or more users to this collection schedule. Takes an array of User instances or user IDs.
 * 
 * @property {(users: Array<import("./userModel.js").UserInstance|number>) => Promise<void>} removeUsers - Remove one or more users from this collection schedule. Takes an array of User instances or user IDs.
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance>} getRecyclery - Get the associated Recyclery (belongs-to relationship).
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number) => Promise<void>} setRecyclery - Set the Recyclery for this collection schedule. Takes a Recyclery instance or recyclery ID.
 * 
 * @property {() => Promise<import("./collectionReceiptModel.js").CollectionReceiptInstance|null>} getCollectionReceipt - Get the associated CollectionReceipt (has-one relationship). Returns null if no receipt exists.
 * 
 * @property {(receipt: import("./collectionReceiptModel.js").CollectionReceiptInstance|number|null) => Promise<void>} setCollectionReceipt - Set or unset the CollectionReceipt for this schedule. Takes a CollectionReceipt instance, receipt ID, or null to remove the association.
 */