/**
 * @typedef {Object} EmployeeStoreCreateAttributes
 * @property {boolean} [is_primary] - Whether this is the primary store assignment for the employee (default: false)
 * @property {number} employee_id - Foreign key reference to the Employee (required)
 * @property {number} store_id - Foreign key reference to the Recyclery (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeStoreCreateAttributes} EmployeeStoreAttributes
 */

/**
 * @typedef {import("sequelize").Model<EmployeeStoreAttributes, EmployeeStoreCreateAttributes> & EmployeeStoreAttributes} EmployeeStoreInstance
 * 
 * @property {() => Promise<import("./recycleryModel.js").RecycleryInstance>} getRecyclery - Get the associated Recyclery (belongs-to relationship). Uses "Recyclery" alias.
 * 
 * @property {(recyclery: import("./recycleryModel.js").RecycleryInstance|number) => Promise<void>} setRecyclery - Set the Recyclery for this employee store assignment. Takes a Recyclery instance or recyclery ID.
 * 
 * @property {() => Promise<import("./employeeModel.js").EmployeeInstance>} getEmployee - Get the associated Employee (belongs-to relationship). Uses "Employee" alias.
 * 
 * @property {(employee: import("./employeeModel.js").EmployeeInstance|number) => Promise<void>} setEmployee - Set the Employee for this employee store assignment. Takes an Employee instance or employee ID.
 */
