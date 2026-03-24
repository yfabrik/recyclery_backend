/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const constraints = [
        {
          table: "GiftCards",
          column: "issued_transaction_id",
          references: "SalesTransactions",
          onDelete: "SET NULL",
        },
        {
          table: "GiftCards",
          column: "issued_refund_transaction_id",
          references: "SalesTransactions",
          onDelete: "SET NULL",
        },
        {
          table: "GiftCards",
          column: "created_by",
          references: "Users",
          onDelete: "SET NULL",
        },
        {
          table: "giftcard_transactions",
          column: "gift_card_id",
          references: "GiftCards",
          onDelete: "CASCADE",
        },
        {
          table: "giftcard_transactions",
          column: "sales_transaction_id",
          references: "SalesTransactions",
          onDelete: "CASCADE",
        },
        {
          table: "giftcard_transactions",
          column: "created_by",
          references: "Users",
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

      await queryInterface.addConstraint("GiftCards", {
        fields: ["initial_value"],
        type: "check",
        where: { initial_value: { [Sequelize.Op.gte]: 0 } },
        name: "chk_giftcards_initial_value_non_negative",
        transaction,
      });

      await queryInterface.addConstraint("giftcard_transactions", {
        fields: ["amount"],
        type: "check",
        where: { amount: { [Sequelize.Op.ne]: 0 } },
        name: "chk_giftcard_transactions_amount_non_zero",
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "giftcard_transactions",
        "chk_giftcard_transactions_amount_non_zero",
        { transaction },
      );
      await queryInterface.removeConstraint(
        "GiftCards",
        "chk_giftcards_initial_value_non_negative",
        { transaction },
      );

      const constraints = [
        { table: "giftcard_transactions", column: "created_by" },
        { table: "giftcard_transactions", column: "sales_transaction_id" },
        { table: "giftcard_transactions", column: "gift_card_id" },
        { table: "GiftCards", column: "created_by" },
        { table: "GiftCards", column: "issued_refund_transaction_id" },
        { table: "GiftCards", column: "issued_transaction_id" },
      ];

      for (const { table, column } of constraints) {
        const name = `fk_${table.toLowerCase()}_${column}`;
        await queryInterface.removeConstraint(table, name, { transaction });
      }
    });
  },
};
