/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Arrivals", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      arrival_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      arrival_time: {
        type: Sequelize.TIME,
      },
      source_type: {
        type: Sequelize.ENUM("point", "apport", "house_clearance"),
      },
      source_details: {
        type: Sequelize.TEXT,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM("received"),
        defaultValue: "received",
      },
      category_id: {
        type: Sequelize.INTEGER,
      },
      subcategory_id: {
        type: Sequelize.INTEGER,
      },
      collection_point_id: {
        type: Sequelize.INTEGER,
      },
      processed_by: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable("Arrivals");
  },
};
