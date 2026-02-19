/**
 * @typedef {Object} CollectionReceiptCreateAttributes
 * @property {string} receipt_number - Receipt number identifier
 * @property {string|null} [items_collected] - Description of items collected (TEXT type)
 * @property {number|null} [total_weight] - Total weight of collected items in decimal format
 * @property {string|null} [notes] - Additional notes about the receipt
 * @property {string|null} [signature_data] - Signature data (TEXT type)
 * @property {string} [status] - Status of the receipt (default: "draft")
 * @property {number} schedule_id - Foreign key reference to the CollectionSchedule (required)
 */

/**
 * Fetched row: all attributes present (no undefined).
 * @typedef {Object} CollectionReceiptRow
 * @property {string} receipt_number
 * @property {string|null} items_collected
 * @property {number|null} total_weight
 * @property {string|null} notes
 * @property {string|null} signature_data
 * @property {string} status
 * @property {number} schedule_id
 */

/** @typedef {import("./baseModelAttributes.js").baseAttributes &CollectionReceiptRow} CollectionReceiptAttributes */

/**
 * @typedef {import("sequelize").Model<CollectionReceiptAttributes, CollectionReceiptCreateAttributes> & CollectionReceiptAttributes} CollectionReceiptInstance
 *
 * @property {() => Promise<import("./collectionSchedule.js").CollectionScheduleInstance>} getCollectionSchedule - Get the associated CollectionSchedule (belongs-to relationship).
 *
 * @property {(schedule: import("./collectionSchedule.js").CollectionScheduleInstance|number) => Promise<void>} setCollectionSchedule - Set the CollectionSchedule for this receipt. Takes a CollectionSchedule instance or schedule ID.
 */
