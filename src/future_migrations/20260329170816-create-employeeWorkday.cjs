"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("EmployeeWorkdays", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      time_slot: {
        type: Sequelize.STRING,
      },
      is_working: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      week: {
        type: Sequelize.STRING,
      },
      notes: {
        type: Sequelize.TEXT,
      },
      employee_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "Employees",
          key: "id",
        },
        onDelete: "CASCADE",
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

    await queryInterface.addIndex("EmployeeWorkdays", ["employee_id"]);
    await queryInterface.addIndex("EmployeeWorkdays", [
      "employee_id",
      "day_of_week",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("EmployeeWorkdays");
  },
};
