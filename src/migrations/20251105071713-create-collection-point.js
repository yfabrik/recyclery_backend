/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CollectionPoints", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
      },
      address: {
        type: Sequelize.TEXT,
      },
      city: {
        type: Sequelize.STRING,
      },
      postal_code: {
        type: Sequelize.STRING,
      },
      contact_person: {
        type: Sequelize.STRING,
      },
      contact_phone: {
        type: Sequelize.STRING,
      },
      contact_email: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.ENUM(
          "standard",
          "entreprise",
          "association",
          "school",
          "hospital",
          "other",
        ),
        defaultValue: "standard",
      },
      notes: {
        type: Sequelize.TEXT,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      recyclery_id: {
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
    await queryInterface.dropTable("CollectionPoints");
  },
};
