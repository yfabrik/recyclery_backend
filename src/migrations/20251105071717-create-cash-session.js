/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CashSessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      cash_register_id: {
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      opening_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      closing_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      expected_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      status: {
        type: Sequelize.ENUM("open", "close"),
        defaultValue: "open",
      },
      notes: {
        type: Sequelize.TEXT,
      },
      closed_at: {
        type: Sequelize.DATE,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CashSessions");
  },
};
