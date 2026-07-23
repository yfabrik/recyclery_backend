"use strict";

/** @param {import("sequelize").QueryInterface} queryInterface */
async function getForeignKeys(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, r.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
      AND k.TABLE_SCHEMA = r.CONSTRAINT_SCHEMA
     WHERE k.TABLE_SCHEMA = DATABASE()
       AND k.TABLE_NAME = :tableName
       AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    {
      replacements: { tableName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    },
  );
  return rows;
}

/** @param {import("sequelize").QueryInterface} queryInterface */
async function replaceForeignKey(
  queryInterface,
  tableName,
  columnName,
  referencedTable,
  { onDelete, onUpdate = "CASCADE" },
) {
  const foreignKeys = await getForeignKeys(queryInterface, tableName);
  const existing = foreignKeys.find((fk) => fk.COLUMN_NAME === columnName);
  if (!existing) return;

  if (existing.DELETE_RULE === onDelete) return;

  await queryInterface.removeConstraint(tableName, existing.CONSTRAINT_NAME);
  await queryInterface.addConstraint(tableName, {
    fields: [columnName],
    type: "foreign key",
    name: existing.CONSTRAINT_NAME,
    references: { table: referencedTable, field: "id" },
    onDelete,
    onUpdate,
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (!["mariadb", "mysql"].includes(dialect)) return;

    const duplicates = await queryInterface.sequelize.query(
      `SELECT recyclery_id, name, GROUP_CONCAT(id ORDER BY id) AS ids, COUNT(*) AS count
       FROM CashRegisters
       GROUP BY recyclery_id, name
       HAVING count > 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    for (const duplicate of duplicates) {
      const ids = String(duplicate.ids).split(",").slice(1);
      for (const id of ids) {
        await queryInterface.sequelize.query(
          `UPDATE CashRegisters
           SET name = CONCAT(name, ' (', :id, ')')
           WHERE id = :id`,
          { replacements: { id } },
        );
      }
    }

    const indexes = await queryInterface.showIndex("CashRegisters");
    const hasUniqueNameIndex = indexes.some(
      (index) =>
        index.unique &&
        index.fields?.length === 2 &&
        index.fields.some((field) => field.attribute === "recyclery_id") &&
        index.fields.some((field) => field.attribute === "name"),
    );

    if (!hasUniqueNameIndex) {
      await queryInterface.addIndex("CashRegisters", ["recyclery_id", "name"], {
        unique: true,
        name: "cash_registers_recyclery_id_name",
      });
    }

    await replaceForeignKey(
      queryInterface,
      "CashRegisters",
      "recyclery_id",
      "Recycleries",
      { onDelete: "CASCADE" },
    );

    await replaceForeignKey(
      queryInterface,
      "CashSessions",
      "cash_register_id",
      "CashRegisters",
      { onDelete: "CASCADE" },
    );

    await replaceForeignKey(
      queryInterface,
      "CashSessions",
      "user_id",
      "Users",
      { onDelete: "RESTRICT" },
    );
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (!["mariadb", "mysql"].includes(dialect)) return;

    const indexes = await queryInterface.showIndex("CashRegisters");
    const uniqueNameIndex = indexes.find(
      (index) => index.name === "cash_registers_recyclery_id_name",
    );
    if (uniqueNameIndex) {
      await queryInterface.removeIndex(
        "CashRegisters",
        "cash_registers_recyclery_id_name",
      );
    }

    await replaceForeignKey(
      queryInterface,
      "CashRegisters",
      "recyclery_id",
      "Recycleries",
      { onDelete: "CASCADE" },
    );

    await replaceForeignKey(
      queryInterface,
      "CashSessions",
      "cash_register_id",
      "CashRegisters",
      { onDelete: "CASCADE" },
    );

    await replaceForeignKey(
      queryInterface,
      "CashSessions",
      "user_id",
      "Users",
      { onDelete: "RESTRICT" },
    );
  },
};
