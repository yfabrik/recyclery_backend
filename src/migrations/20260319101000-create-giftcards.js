/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("GiftCards", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      initial_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "partially_used",
          "redeemed",
          "expired",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "active",
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "EUR",
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      issued_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      issued_refund_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recipient_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      recipient_email: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex("GiftCards", ["status"]);
    await queryInterface.addIndex("GiftCards", ["expires_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("GiftCards");
  },
};
