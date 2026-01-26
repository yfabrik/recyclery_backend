/**
 * @typedef {Object} EmployeeStoreCreateAttributes
 * @property {boolean} [is_primary] - Whether this is the primary store assignment for the employee (default: false)
 * @property {number} employeeId - Foreign key reference to the Employee (required)
 * @property {number} recycleryId - Foreign key reference to the Recyclery (required)
 *
 * @typedef {import("./baseModelAttributes.js").baseAttributes & EmployeeStoreCreateAttributes} EmployeeStoreAttributes
 *
 * @typedef {Object} EmployeeStoreInstanceMethods
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance>} getRecyclery - Get the associated Recyclery (belongs-to). Uses "Recyclery" alias.
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance | number) => Promise<void>} setRecyclery - Set the Recyclery for this assignment.
 * @property {() => Promise<import("./employeeModel.js").EmployeeInstance>} getEmployee - Get the associated Employee (belongs-to). Uses "Employee" alias.
 * @property {(employee: import("./employeeModel.js").EmployeeInstance | number) => Promise<void>} setEmployee - Set the Employee for this assignment.
 *
 * @typedef {import("sequelize").Model<EmployeeStoreAttributes, EmployeeStoreCreateAttributes> & EmployeeStoreAttributes & EmployeeStoreInstanceMethods} EmployeeStoreInstance
 *
 * @typedef {Object} EmployeeStoreBulkUpdateOptionsLike
 * @property {{ is_primary?: boolean }} [attributes]
 * @property {import("sequelize").WhereOptions} [where]
 * @property {import("sequelize").Transaction | null} [transaction]
 */
