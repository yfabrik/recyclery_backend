/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Tasks", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      schedule_id: {
        type: Sequelize.INTEGER,
      },
      store_id: {
        type: Sequelize.INTEGER,
      },
      collection_point_id: {
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
      priority: {
        type: Sequelize.STRING,
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
      hourly_rate: {
        type: Sequelize.DECIMAL,
      },
      scheduled_date: {
        type: Sequelize.DATE,
      },
      start_time: {
        type: Sequelize.DATE,
      },
      end_time: {
        type: Sequelize.DATE,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("Tasks");
  },
};
