/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("TaskTemplates", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
      category: {
        type: Sequelize.ENUM("vente", "point", "collection", "custom"),
        allowNull: false,
      },
      scheduled_date: {
        type: Sequelize.DATE,
      },
      start_time: {
        type: Sequelize.TIME,
      },
      end_time: {
        type: Sequelize.TIME,
      },
      priority: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      hourly_rate: {
        type: Sequelize.DECIMAL,
      },
      required_skills: {
        type: Sequelize.TEXT,
      },
      location: {
        type: Sequelize.STRING,
      },
      equipment_needed: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("TaskTemplates");
  },
};
