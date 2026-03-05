/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CollectionReceipts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      receipt_number: {
        type: Sequelize.STRING,
      },
      items_collected: {
        type: Sequelize.TEXT,
      },
      total_weight: {
        type: Sequelize.DECIMAL,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      signature_data: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "draft",
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
    await queryInterface.dropTable("CollectionReceipts");
  },
};
