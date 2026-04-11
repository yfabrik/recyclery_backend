/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("giftcard_transactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      gift_card_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sales_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          "issue",
          "charge",
          "refund_recredit",
          "manual_adjustment",
          "expire",
        ),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      occurred_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("giftcard_transactions", [
      "gift_card_id",
      "occurred_at",
    ]);
    await queryInterface.addIndex("giftcard_transactions", [
      "sales_transaction_id",
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("giftcard_transactions");
  },
};
