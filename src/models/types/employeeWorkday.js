/**
 * @typedef {Object} EmployeeWorkdaysAttribute

 * @property {string} day_of_week
 * @property {string} time_slot
 * @property {boolean} is_working
 * @property {Date} start_time
 * @property {Date} end_time
 * @property {string} notes
 * @typedef { import("./baseModelAttributes.js").baseAttributes & EmployeeWorkdaysAttribute} EmployeeWorkdaysAttributes


 */

/**
 * @typedef { import("sequelize").Model<EmployeeWorkdaysAttributes, EmployeeWorkdaysAttributes> & EmployeeWorkdaysAttributes} EmployeeWorkdaysInstance
 */