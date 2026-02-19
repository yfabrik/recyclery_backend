/**
 * @typedef {Object} RecycleryCreateAttributes
 * @property {string} name - Name of the recyclery/store (required)
 * @property {string|null} [address] - Physical address of the recyclery
 * @property {string|null} [phone] - Phone number of the recyclery
 * @property {string|null} [email] - Email address of the recyclery
 * @property {string|null} [city] - City where the recyclery is located
 * @property {string|null} [postal_code] - Postal code of the recyclery location
 * @property {boolean} [is_active] - Whether the recyclery is currently active (default: true)
 * @property {number|null} [manager_id] - Foreign key reference to the User who manages this recyclery
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} RecycleryRow
 * @property {string} name
 * @property {string|null} address
 * @property {string|null} phone
 * @property {string|null} email
 * @property {string|null} city
 * @property {string|null} postal_code
 * @property {boolean} is_active
 * @property {number|null} manager_id
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &RecycleryRow} RecycleryAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} RecycleryInstanceAssociations
 * @property {Array<import("./labeledItemModel.js").LabeledItemInstance>} [LabeledItems] - Labeled items when loaded with include
 * @property {Array<import("./donationModel.js").DonationInstance>} [Donations] - Donations when loaded with include
 * @property {Array<import("./employeeModel.js").EmployeeInstance>} [employees] - Employees when loaded with include (alias "employees")
 * @property {import("./userModel.js").UserInstance} [manager] - Manager when loaded with include (alias "manager")
 * @property {Array<import("./cashRegisterModel.js").CashRegisterInstance>} [caisses] - Cash registers when loaded with include (alias "caisses")
 * @property {Array<import("./collectionPointModel.js").CollectionPointInstance>} [CollectionPoints] - Collection points when loaded with include
 * @property {Array<import("./taskScheduleModel.js").TaskScheduleInstance>} [TaskSchedules] - Task schedules when loaded with include (alias "horaires")
 *
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items associated with this recyclery (has-many relationship).
 *
 * @property {(values?: import("./labeledItemModel.js").LabeledItemCreateAttributes) => Promise<import("./labeledItemModel.js").LabeledItemInstance>} createLabeledItem - Create a new labeled item for this recyclery (has-many).
 *
 * @property {() => Promise<Array<import("./donationModel.js").DonationInstance>>} getDonations - Get all donations associated with this recyclery (has-many relationship).
 *
 * @property {(values?: import("./donationModel.js").DonationCreateAttributes) => Promise<import("./donationModel.js").DonationInstance>} createDonation - Create a new donation for this recyclery (has-many).
 *
 * @property {() => Promise<Array<import("./taskModel.js").TaskInstance>>} getTasks - Get all tasks associated with this recyclery (has-many relationship through store_id). CASCADE delete enabled.
 *
 * @property {(values?: import("./taskModel.js").TaskCreateAttributes) => Promise<import("./taskModel.js").TaskInstance>} createTask - Create a new task for this recyclery (has-many).
 *
 * @property {() => Promise<Array<import("./taskScheduleModel.js").TaskScheduleInstance>>} getTaskSchedules - Get all task schedules associated with this recyclery (has-many relationship through store_id). CASCADE delete enabled.
 *
 * @property {(values?: import("./taskScheduleModel.js").TaskScheduleCreateAttributes) => Promise<import("./taskScheduleModel.js").TaskScheduleInstance>} createTaskSchedule - Create a new task schedule for this recyclery (has-many).
 *
 * @property {() => Promise<Array<import("./employeeModel.js").EmployeeInstance>>} getEmployees - Get all employees associated with this recyclery (many-to-many relationship through "EmployeeStore" table). Uses "employees" alias.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} setEmployees - Replace all employees associated with this recyclery. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} addEmployees - Add one or more employees to this recyclery. Takes an array of Employee instances or employee IDs.
 *
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>, options?: import("sequelize").BelongsToManySetAssociationsMixinOptions) => Promise<void>} removeEmployees - Remove one or more employees from this recyclery. Takes an array of Employee instances or employee IDs.
 *
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getManager - Get the manager of this recyclery (belongs-to relationship). Returns null if no manager is assigned. Uses "manager" alias.
 *
 * @property {(manager: import("./userModel.js").UserInstance|number|null, options?: import("sequelize").BelongsToSetAssociationMixinOptions) => Promise<void>} setManager - Set or unset the manager for this recyclery. Takes a User instance, user ID, or null to remove the manager.
 *
 * @property {(values?: import("./userModel.js").UserCreateAttributes, options?: import("sequelize").CreateOptions) => Promise<import("./userModel.js").UserInstance>} createManager - Create a new User and set as manager (belongsTo createX).
 *
 * @property {() => Promise<Array<import("./cashRegisterModel.js").CashRegisterInstance>>} getCaisses - Get all cash registers for this recyclery (has-many relationship). Uses "caisses" alias. CASCADE delete enabled.
 *
 * @property {(values?: import("./cashRegisterModel.js").CashRegisterCreateAttributes) => Promise<import("./cashRegisterModel.js").CashRegisterInstance>} createCaisse - Create a new cash register for this recyclery (has-many, alias "caisses").
 *
 * @property {() => Promise<Array<import("./collectionPointModel.js").CollectionPointInstance>>} getCollectionPoints - Get all collection points for this recyclery (has-many relationship).
 *
 * @property {(values?: import("./collectionPointModel.js").CollectionPointCreateAttributes) => Promise<import("./collectionPointModel.js").CollectionPointInstance>} createCollectionPoint - Create a new collection point for this recyclery (has-many).
 */

/**
 * @typedef {import("sequelize").Model<RecycleryAttributes, RecycleryCreateAttributes> & RecycleryAttributes & RecycleryInstanceAssociations} RecycleryInstance
 */
