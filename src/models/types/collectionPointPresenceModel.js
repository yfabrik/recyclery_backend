/**
 * @typedef {Object} CollectionPointPresenceCreateAttributes
 * @property {string} day_of_week - Day of the week (e.g., "Monday", "Tuesday", etc.)
 * @property {string|null} [time_slot_name] - Name or identifier of the time slot
 * @property {boolean} is_present - Whether presence is scheduled for this time slot
 * @property {string|null} [start_time] - Start time in "HH:mm:ss" format (TIME type)
 * @property {string|null} [end_time] - End time in "HH:mm:ss" format (TIME type)
 * @property {boolean} [is_24h] - Whether this is a 24-hour presence slot
 * @property {string|null} [notes] - Additional notes about the presence
 * @property {number} collection_point_id - Foreign key reference to the CollectionPoint (required)
 * @property {number} store_id - Foreign key reference to the Recyclery (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionPointPresenceCreateAttributes} CollectionPointPresenceAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointPresenceAttributes, CollectionPointPresenceCreateAttributes> & CollectionPointPresenceAttributes} CollectionPointPresenceInstance
 * 
 * @property {() => Promise<import("./collectionPointModel.js").CollectionPointInstance>} getCollectionPoint - Get the associated CollectionPoint (belongs-to relationship).
 * 
 * @property {(collectionPoint: import("./collectionPointModel.js").CollectionPointInstance|number) => Promise<void>} setCollectionPoint - Set the CollectionPoint for this presence. Takes a CollectionPoint instance or collection point ID.
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Uses "Recyclery" alias.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number) => Promise<void>} setRecyclery - Set the Recyclery for this presence. Takes a Recyclery instance or recyclery ID.
 */