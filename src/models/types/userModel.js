/**
 * @typedef {Object} UserCreateAttributes
 * @property {string} username - Username for the user
 * @property {string} email - Email address (must be unique and valid email format)
 * @property {string} password - Password hash (excluded from default scope)
 * @property {string} [password_hash] - Password hash (excluded from default scope)
 * 
 * @property {string|null} [role] - User role (default: "employee")
 * @property {string|null} [phone] - Phone number
 * @property {boolean} [isActive] - Whether the user account is active (default: true)
 * @property {Date|string|null} [last_login] - Date and time of last login
 * 
 * @typedef { import("./baseModelAttributes.js").baseAttributes & UserCreateAttributes} UserAttributes
 */

/**
 * @typedef {import("sequelize").Model<UserAttributes, UserCreateAttributes> & UserAttributes} UserInstance
 *
 * @property {Array<import("./donationModel.js").DonationInstance>} [Donations] - Donations received by this user when loaded with include (received_by)
 * @property {Array<import("./salesTransactionModel.js").SalesTransactionInstance>} [SalesTransactions] - Sales transactions created by this user when loaded with include (created_by)
 * @property {Array<import("./collectionReceiptModel.js").CollectionReceiptInstance>} [CollectionReceipts] - Collection receipts processed by this user when loaded with include (processed_by)
 * @property {Array<import("./labeledItemModel.js").LabeledItemInstance>} [LabeledItems] - Labeled items created by this user when loaded with include (created_by)
 * @property {Array<import("./arrivalModel.js").ArrivalInstance>} [Arrivals] - Arrivals processed by this user when loaded with include (processed_by)
 * @property {Array<import("./recycleryModel.js").RecycleryInstance>} [managedStores] - Recycleries managed by this user when loaded with include (alias "managedStores", manager_id)
 *
 * @property {() => Promise<Array<import("./donationModel.js").DonationInstance>>} getDonations - Get all donations received by this user (has-many relationship through "received_by" foreign key).
 *
 * @property {(values?: import("./donationModel.js").DonationCreateAttributes) => Promise<import("./donationModel.js").DonationInstance>} createDonation - Create a new donation received by this user (has-many).
 *
 * @property {() => Promise<Array<import("./salesTransactionModel.js").SalesTransactionInstance>>} getSalesTransactions - Get all sales transactions created by this user (has-many relationship through "created_by" foreign key).
 *
 * @property {(values?: import("./salesTransactionModel.js").SalesTransactionCreateAttributes) => Promise<import("./salesTransactionModel.js").SalesTransactionInstance>} createSalesTransaction - Create a new sales transaction for this user (has-many).
 *
 * @property {() => Promise<Array<import("./collectionReceiptModel.js").CollectionReceiptInstance>>} getCollectionReceipts - Get all collection receipts processed by this user (has-many relationship through "processed_by" foreign key).
 *
 * @property {(values?: import("./collectionReceiptModel.js").CollectionReceiptCreateAttributes) => Promise<import("./collectionReceiptModel.js").CollectionReceiptInstance>} createCollectionReceipt - Create a new collection receipt for this user (has-many).
 *
 * @property {() => Promise<Array<import("./labeledItemModel.js").LabeledItemInstance>>} getLabeledItems - Get all labeled items created by this user (has-many relationship through "created_by" foreign key).
 *
 * @property {(values?: import("./labeledItemModel.js").LabeledItemCreateAttributes) => Promise<import("./labeledItemModel.js").LabeledItemInstance>} createLabeledItem - Create a new labeled item for this user (has-many).
 *
 * @property {() => Promise<Array<import("./arrivalModel.js").ArrivalInstance>>} getArrivals - Get all arrivals processed by this user (has-many relationship through "processed_by" foreign key).
 *
 * @property {(values?: import("./arrivalModel.js").ArrivalCreateAttributes) => Promise<import("./arrivalModel.js").ArrivalInstance>} createArrival - Create a new arrival processed by this user (has-many).
 *
 * @property {() => Promise<Array<import("./recycleryModel.js").RecycleryInstance>>} getManagedStores - Get all recycleries managed by this user (has-many relationship through "manager_id" foreign key). Uses "managedStores" alias.
 *
 * @property {(values?: import("./recycleryModel.js").RecycleryCreateAttributes) => Promise<import("./recycleryModel.js").RecycleryInstance>} createManagedStore - Create a new recyclery and set this user as manager (has-many with alias "managedStores").
 */
