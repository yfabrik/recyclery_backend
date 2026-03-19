/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const constraints = [
        {
          table: "transaction_payments",
          column: "sales_transaction_id",
          references: "SalesTransactions",
          onDelete: "CASCADE",
        },
        {
          table: "transaction_payments",
          column: "gift_card_id",
          references: "GiftCards",
          onDelete: "SET NULL",
        },
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

      await queryInterface.addConstraint("transaction_payments", {
        fields: ["amount"],
        type: "check",
        where: { amount: { [Sequelize.Op.gt]: 0 } },
        name: "chk_transaction_payments_amount_positive",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "transaction_payments",
        "chk_transaction_payments_amount_positive",
        { transaction },
      );

      const constraints = [
        { table: "transaction_payments", column: "gift_card_id" },
        { table: "transaction_payments", column: "sales_transaction_id" },
      ];

      for (const { table, column } of constraints) {
        const name = `fk_${table.toLowerCase()}_${column}`;
        await queryInterface.removeConstraint(table, name, { transaction });
      }
    });
  },
};
