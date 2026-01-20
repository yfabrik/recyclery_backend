/**
 * @typedef {Object} EmployeeWorkdaysCreateAttributes
 * @property {string} day_of_week - Day of the week (e.g., "Monday", "Tuesday", etc.)
 * @property {string} [time_slot] - Time slot identifier or description
 * @property {boolean} is_working - Whether the employee is working on this day
 * @property {string} [start_time] - Start time in "HH:mm:ss" format (TIME type)
 * @property {string} [end_time] - End time in "HH:mm:ss" format (TIME type)
 * @property {string|null} [notes] - Additional notes about the workday
 * @property {number} employee_id - Foreign key reference to the Employee (required)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeWorkdaysCreateAttributes} EmployeeWorkdaysAttributes
 */

/**
 * @typedef {import("sequelize").Model<EmployeeWorkdaysAttributes, EmployeeWorkdaysCreateAttributes> & EmployeeWorkdaysAttributes} EmployeeWorkdaysInstance
 * 
 * @property {() => Promise<import("./employeeModel.js").EmployeeInstance>} getEmployee - Get the associated Employee (belongs-to relationship). Uses "Employee" alias.
 * 
 * @property {(employee: import("./employeeModel.js").EmployeeInstance|number) => Promise<void>} setEmployee - Set the Employee for this workday. Takes an Employee instance or employee ID.
 */