/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("WasteDisposals", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      disposal_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      disposal_type: {
        type: Sequelize.ENUM("eco_organism", "landfill", "recycling", "other"),
        allowNull: false,
      },
      weight_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      volume_m3: {
        type: Sequelize.DECIMAL(10, 2),
      },
      transport_method: {
        type: Sequelize.STRING,
      },
      transport_company: {
        type: Sequelize.STRING,
      },
      transport_cost: {
        type: Sequelize.DECIMAL(10, 2),
      },
      notes: {
        type: Sequelize.TEXT,
      },
      category_id: {
        type: Sequelize.INTEGER,
      },
      subcategory_id: {
        type: Sequelize.INTEGER,
      },
      eco_organism_id: {
        type: Sequelize.INTEGER,
      },
      created_by: {
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
    await queryInterface.dropTable("WasteDisposals");
  },
};
