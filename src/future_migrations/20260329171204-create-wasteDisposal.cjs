"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("WasteDisposals", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      disposal_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "Categories",
          key: "id",
        },
      },
      subcategory_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "Categories",
          key: "id",
        },
      },
      eco_organism_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "EcoOrganisms",
          key: "id",
        },
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
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

    await queryInterface.addIndex("WasteDisposals", ["disposal_date"]);
    await queryInterface.addIndex("WasteDisposals", ["category_id"]);
    await queryInterface.addIndex("WasteDisposals", ["eco_organism_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("WasteDisposals");
  },
};
