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
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & RecycleryCreateAttributes} RecycleryAttributes
 */

/**
 * @typedef {import("sequelize").Model<RecycleryAttributes, RecycleryCreateAttributes> & RecycleryAttributes} RecycleryInstance
 * 
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items associated with this recyclery (has-many relationship).
 * 
 * @property {() => Promise<Array<import("./donationModel.js").DonationInstance>>} getDonations - Get all donations associated with this recyclery (has-many relationship).
 * 
 * @property {() => Promise<Array<import("./collectionSchedule.js").CollectionScheduleInstance>>} getCollectionSchedules - Get all collection schedules for this recyclery (has-many relationship).
 * 
 * @property {() => Promise<Array<import("./storeHours.js").StoreHoursInstance>>} getHoraires - Get all store hours for this recyclery (has-many relationship). Uses "horaires" alias. CASCADE delete enabled.
 * 
 * @property {() => Promise<Array<import("./employeeModel.js").EmployeeInstance>>} getEmployees - Get all employees associated with this recyclery (many-to-many relationship through "EmployeeStore" table). Uses "employees" alias.
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} setEmployees - Replace all employees associated with this recyclery. Takes an array of Employee instances or employee IDs.
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} addEmployees - Add one or more employees to this recyclery. Takes an array of Employee instances or employee IDs.
 * 
 * @property {(employees: Array<import("./employeeModel.js").EmployeeInstance|number>) => Promise<void>} removeEmployees - Remove one or more employees from this recyclery. Takes an array of Employee instances or employee IDs.
 * 
 * @property {() => Promise<import("./userModel.js").UserInstance|null>} getManager - Get the manager of this recyclery (belongs-to relationship). Returns null if no manager is assigned. Uses "manager" alias.
 * 
 * @property {(manager: import("./userModel.js").UserInstance|number|null) => Promise<void>} setManager - Set or unset the manager for this recyclery. Takes a User instance, user ID, or null to remove the manager.
 * 
 * @property {() => Promise<Array<import("./cashRegisterModel.js").CashRegisterInstance>>} getCaisses - Get all cash registers for this recyclery (has-many relationship). Uses "caisses" alias. CASCADE delete enabled.
 */