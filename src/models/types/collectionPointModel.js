/**
 * @typedef {Object} CollectionPointCreateAttributes
 * @property {string} name - Name of the collection point (required, unique)
 * @property {string|null} [address] - Physical address of the collection point
 * @property {string|null} [city] - City where the collection point is located
 * @property {string|null} [postal_code] - Postal code of the collection point location
 * @property {string|null} [contact_person] - Name of the contact person (alphanumeric)
 * @property {string|null} [contact_phone] - Phone number of the contact person
 * @property {string|null} [contact_email] - Email address of the contact person
 * @property {"standard"| "entreprise"| "association"| "school"| "hospital"| "other"} [type] - Type of collection point (default: "standard")
 * @property {string|null} [notes] - Additional notes about the collection point
 * @property {boolean} [is_active] - Whether the collection point is currently active (default: true)
 * @property {number|null} [recyclery_id] - Foreign key reference to the Recyclery
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CollectionPointCreateAttributes} CollectionPointAttributes
 */

/**
 * @typedef {import("sequelize").Model<CollectionPointAttributes, CollectionPointCreateAttributes> & CollectionPointAttributes} CollectionPointInstance
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance|null>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Returns null if no recyclery is associated.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number|null) => Promise<void>} setRecyclery - Set or unset the Recyclery for this collection point. Takes a Recyclery instance, recyclery ID, or null to remove the association.
 * 
 * @property {() => Promise<Array<import("./collectionSchedule.js").CollectionScheduleInstance>>} getCollectionSchedules - Get all collection schedules associated with this collection point (has-many relationship through collection_point_id foreign key).
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} setCollectionSchedules - Replace all collection schedules associated with this collection point. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} addCollectionSchedules - Add one or more collection schedules to this collection point. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {(schedules: Array<import("./collectionSchedule.js").CollectionScheduleInstance|number>) => Promise<void>} removeCollectionSchedules - Remove one or more collection schedules from this collection point. Takes an array of CollectionSchedule instances or schedule IDs.
 * 
 * @property {() => Promise<Array<import("./arrivalModel.js").ArrivalInstance>>} getArrivals - Get all arrivals associated with this collection point (has-many relationship through collection_point_id foreign key).
 * 
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} setArrivals - Replace all arrivals associated with this collection point. Takes an array of Arrival instances or arrival IDs.
 * 
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} addArrivals - Add one or more arrivals to this collection point. Takes an array of Arrival instances or arrival IDs.
 * 
 * @property {(arrivals: Array<import("./arrivalModel.js").ArrivalInstance|number>) => Promise<void>} removeArrivals - Remove one or more arrivals from this collection point. Takes an array of Arrival instances or arrival IDs.
 * 
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this collection point (has-many relationship).
 * 
 * @property {() => Promise<Array<import("./taskSchedule.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules associated with this collection point (has-many relationship through collection_point_id foreign key). CASCADE delete enabled.
 */