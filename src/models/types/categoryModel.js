/**
 * @typedef {Object} CategoryCreateAttributes
 * @property {string} name - The name of the category (required)
 * @property {string|null} [description] - Detailed description of the category
 * @property {string|null} [icon] - Icon identifier or path for the category
 * @property {number|null} [parent_id] - Foreign key reference to the parent category (for hierarchical categories). Null for top-level categories.
 * @property {number} [defaultWeight] - Default weight for items in this category (default: 0, min: 0)
 * @property {number} [defaultPrice] - Default price for items in this category (default: 0, min: 0)
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CategoryCreateAttributes} CategoryAttributes
 */

/**
 * @typedef {import("sequelize").Model<CategoryAttributes, CategoryCreateAttributes> & CategoryAttributes} CategoryInstance
 * 
 * @property {() => Promise<Array<CategoryInstance>>} getSubcategories - Get all subcategories (child categories) of this category. Returns an array of Category instances. Uses "subcategories" alias.
 * 
 * @property {() => Promise<CategoryInstance|null>} getParent - Get the parent category of this category (belongs-to relationship). Returns null if this is a top-level category. Uses "parent" alias.
 * 
 * @property {(parent: CategoryInstance|number|null) => Promise<void>} setParent - Set or unset the parent category. Takes a Category instance, category ID, or null to make this a top-level category.
 * 
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items associated with this category (has-many relationship through category_id foreign key).
 * 
 * @property {(labeledItems: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} setLabeledItems - Replace all labeled items associated with this category. Takes an array of LabeledItem instances or item IDs.
 * 
 * @property {(labeledItems: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} addLabeledItems - Add one or more labeled items to this category. Takes an array of LabeledItem instances or item IDs.
 * 
 * @property {(labeledItems: Array<import("./labeledItemModel.js").LabeledItemInstance|number>) => Promise<void>} removeLabeledItems - Remove one or more labeled items from this category. Takes an array of LabeledItem instances or item IDs.
 */
