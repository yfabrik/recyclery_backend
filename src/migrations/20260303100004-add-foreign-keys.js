/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const constraints = [
      { table: "Recycleries", column: "manager_id", references: "Users", onDelete: "SET NULL" },
      { table: "Categories", column: "parent_id", references: "Categories", onDelete: "CASCADE" },
      { table: "Donations", column: "recyclery_id", references: "Recycleries", onDelete: "RESTRICT" },
      { table: "Donations", column: "received_by", references: "Users", onDelete: "SET NULL" },
      { table: "CollectionPoints", column: "recyclery_id", references: "Recycleries", onDelete: "RESTRICT" },
      { table: "Arrivals", column: "category_id", references: "Categories", onDelete: "SET NULL" },
      { table: "Arrivals", column: "subcategory_id", references: "Categories", onDelete: "SET NULL" },
      { table: "Arrivals", column: "collection_point_id", references: "CollectionPoints", onDelete: "SET NULL" },
      { table: "Arrivals", column: "processed_by", references: "Users", onDelete: "SET NULL" },
      { table: "CashRegisters", column: "recyclery_id", references: "Recycleries", onDelete: "CASCADE" },
      { table: "CashSessions", column: "cash_register_id", references: "CashRegisters", onDelete: "CASCADE" },
      { table: "CashSessions", column: "user_id", references: "Users", onDelete: "SET NULL" },
      { table: "SalesTransactions", column: "cash_session_id", references: "CashSessions", onDelete: "SET NULL" },
      { table: "SalesTransactions", column: "created_by", references: "Users", onDelete: "SET NULL" },
      { table: "transaction_items", column: "transaction_id", references: "SalesTransactions", onDelete: "CASCADE" },
      { table: "transaction_items", column: "labeled_item_id", references: "LabeledItems", onDelete: "SET NULL" },
      { table: "TaskSchedules", column: "store_id", references: "Recycleries", onDelete: "CASCADE" },
      { table: "TaskSchedules", column: "collection_point_id", references: "CollectionPoints", onDelete: "CASCADE" },
      { table: "Tasks", column: "schedule_id", references: "TaskSchedules", onDelete: "CASCADE" },
      { table: "Tasks", column: "store_id", references: "Recycleries", onDelete: "CASCADE" },
      { table: "Tasks", column: "collection_point_id", references: "CollectionPoints", onDelete: "SET NULL" },
      { table: "employee_store", column: "employeeId", references: "Employees", onDelete: "CASCADE" },
      { table: "employee_store", column: "recycleryId", references: "Recycleries", onDelete: "CASCADE" },
      { table: "LabeledItems", column: "category_id", references: "Categories", onDelete: "SET NULL" },
      { table: "LabeledItems", column: "subcategory_id", references: "Categories", onDelete: "SET NULL" },
      { table: "LabeledItems", column: "recyclery_id", references: "Recycleries", onDelete: "RESTRICT" },
      { table: "LabeledItems", column: "created_by", references: "Users", onDelete: "SET NULL" },
      { table: "EmployeeWorkdays", column: "employee_id", references: "Employees", onDelete: "CASCADE" },
      { table: "WasteDisposals", column: "category_id", references: "Categories", onDelete: "SET NULL" },
      { table: "WasteDisposals", column: "subcategory_id", references: "Categories", onDelete: "SET NULL" },
      { table: "WasteDisposals", column: "eco_organism_id", references: "EcoOrganisms", onDelete: "SET NULL" },
      { table: "WasteDisposals", column: "created_by", references: "Users", onDelete: "SET NULL" },
      { table: "Promotions", column: "category_id", references: "Categories", onDelete: "SET NULL" },
    ];

      for (const { table, column, references, onDelete } of constraints) {
        const name = `fk_${table.toLowerCase()}_${column}`;
        await queryInterface.addConstraint(table, {
          fields: [column],
          type: "foreign key",
          name,
          references: { table: references, field: "id" },
          onDelete,
          onUpdate: "CASCADE",
          transaction,
        });
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const constraints = [
      { table: "Promotions", column: "category_id" },
      { table: "WasteDisposals", column: "created_by" },
      { table: "WasteDisposals", column: "eco_organism_id" },
      { table: "WasteDisposals", column: "subcategory_id" },
      { table: "WasteDisposals", column: "category_id" },
      { table: "EmployeeWorkdays", column: "employee_id" },
      { table: "LabeledItems", column: "created_by" },
      { table: "LabeledItems", column: "recyclery_id" },
      { table: "LabeledItems", column: "subcategory_id" },
      { table: "LabeledItems", column: "category_id" },
      { table: "employee_store", column: "recycleryId" },
      { table: "employee_store", column: "employeeId" },
      { table: "Tasks", column: "collection_point_id" },
      { table: "Tasks", column: "store_id" },
      { table: "Tasks", column: "schedule_id" },
      { table: "TaskSchedules", column: "collection_point_id" },
      { table: "TaskSchedules", column: "store_id" },
      { table: "transaction_items", column: "labeled_item_id" },
      { table: "transaction_items", column: "transaction_id" },
      { table: "SalesTransactions", column: "created_by" },
      { table: "SalesTransactions", column: "cash_session_id" },
      { table: "CashSessions", column: "user_id" },
      { table: "CashSessions", column: "cash_register_id" },
      { table: "CashRegisters", column: "recyclery_id" },
      { table: "Arrivals", column: "processed_by" },
      { table: "Arrivals", column: "collection_point_id" },
      { table: "Arrivals", column: "subcategory_id" },
      { table: "Arrivals", column: "category_id" },
      { table: "CollectionPoints", column: "recyclery_id" },
      { table: "Donations", column: "received_by" },
      { table: "Donations", column: "recyclery_id" },
      { table: "Categories", column: "parent_id" },
      { table: "Recycleries", column: "manager_id" },
    ];

      for (const { table, column } of constraints) {
        const name = `fk_${table.toLowerCase()}_${column}`;
        await queryInterface.removeConstraint(table, name, { transaction });
      }
    });
  },
};
