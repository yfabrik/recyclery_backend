/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transaction_payments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sales_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      method: {
        type: Sequelize.ENUM("cash", "card", "check", "giftcard"),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      gift_card_id: {
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

    await queryInterface.addIndex("transaction_payments", [
      "sales_transaction_id",
    ]);
    await queryInterface.addIndex("transaction_payments", ["method"]);
    await queryInterface.addIndex("transaction_payments", ["gift_card_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("transaction_payments");
  },
};
