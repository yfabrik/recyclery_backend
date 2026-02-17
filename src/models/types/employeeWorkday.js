/**
 * @typedef {Object} EmployeeWorkdaysCreateAttributes
 * @property {string|null} [day_of_week] - Day of the week (e.g., "Monday", "Tuesday", etc.)
 * @property {string|null} [time_slot] - Time slot identifier or description
 * @property {boolean|null} [is_working] - Whether the employee is working on this day
 * @property {string|null} [start_time] - Start time in "HH:mm:ss" format (TIME type)
 * @property {string|null} [end_time] - End time in "HH:mm:ss" format (TIME type)
 * @property {string|null} [notes] - Additional notes about the workday
 * @property {string|null} [week] - Week identifier
 * @property {number|null} [employee_id] - Foreign key reference to the Employee
 *
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeWorkdaysCreateAttributes} EmployeeWorkdaysAttributes
 */

/**
 * @typedef {import("sequelize").Model<EmployeeWorkdaysAttributes, EmployeeWorkdaysCreateAttributes> & EmployeeWorkdaysAttributes} EmployeeWorkdaysInstance
 *
 * @property {import("./employeeModel.js").EmployeeInstance} [Employee] - Associated Employee when loaded with include
 *
 * @property {() => Promise<import("./employeeModel.js").EmployeeInstance|null>} getEmployee - Get the associated Employee (belongs-to relationship). Returns null if not set. Uses "Employee" alias.
 *
 * @property {(employee: import("./employeeModel.js").EmployeeInstance|number|null) => Promise<void>} setEmployee - Set or unset the Employee for this workday. Takes an Employee instance, employee ID, or null to remove the association.
 */
