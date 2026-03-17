/**
 * @typedef {Object} SkillCreateAttributes
 * @property {string} name
 * @property {string} [description]
 * @property {string} [isActive]
 */

/**
 * Fetched row: all attributes present (no undefined). Use for instance returned from findOne/findByPk/findAll.
 * @typedef {Object} SkillRow
 * @property {string} name
 * @property {string} description
 * @property {string} isActive
 */

/** @typedef { import("./baseModelAttributes.js").baseAttributes &SkillRow} SkillAttributes */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} SkillInstanceAssociations
  */

/**
 * @typedef {import("sequelize").Model<SkillAttributes, SkillCreateAttributes> & SkillAttributes & SkillInstanceAssociations} SkillInstance
 */
