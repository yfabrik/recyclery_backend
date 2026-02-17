/**
 * @typedef {Object} CategoryCreateAttributes
 * @property {string} name - The name of the category (required)
 * @property {string|null} [description] - Detailed description of the category
 * @property {string|null} [icon] - Icon identifier or path for the category
 * @property {number|null} [parent_id] - Foreign key reference to the parent category (for hierarchical categories). Null for top-level categories.
 * @property {number|null} [defaultWeight] - Default weight for items in this category (default: 0, min: 0)
 * @property {number|null} [defaultPrice] - Default price for items in this category (default: 0, min: 0)
 * @property {number} [IO] - IO flag (optional at create; default: 0)
 *
 * @typedef {Object} CategoryAttributesIO
 * @property {number} IO - Always defined when fetched (optional at create, default: 0)
 *
 * @typedef { import("./baseModelAttributes.js").baseAttributes & CategoryCreateAttributes & CategoryAttributesIO} CategoryAttributes
 * 
 */

/**
 * Optional association properties present when the instance is loaded with include().
 * @typedef {Object} CategoryInstanceAssociations
 * @property {Array<CategoryInstance>} [subcategories] - Subcategories when loaded with include (alias "subcategories")
 * @property {CategoryInstance} [parent] - Parent category when loaded with include (alias "parent")
 * @property {Array<import("./labeledItemModel.js").LabeledItemInstance>} [LabeledItems] - Labeled items when loaded with include
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
 *
 * @property {(values?: import("./labeledItemModel.js").LabeledItemCreateAttributes) => Promise<import("./labeledItemModel.js").LabeledItemInstance>} createLabeledItem - Create a new labeled item for this category (has-many).
 *
 * @property {(values?: CategoryCreateAttributes) => Promise<CategoryInstance>} createSubcategory - Create a new subcategory (has-many Category with alias "subcategories").

 */

/**
 * @typedef {import("sequelize").Model<CategoryAttributes, CategoryCreateAttributes> & CategoryAttributes & CategoryInstanceAssociations} CategoryInstance
  */
