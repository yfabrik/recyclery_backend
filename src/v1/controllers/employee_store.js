import createHttpError from "http-errors";
import db from "../../models/index.js";
import { cast, col, literal } from "sequelize";
const { User, Recyclery, sequelize, EmployeeStore } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listEmployeeStore = async (req, res) => {
  const assignments = await User.findAll({
    include: [{ model: Recyclery, as: "stores" }],
  });

  res.json({
    success: true,
    assignments,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const getEmployeeStoreById = async (req, res) => {
  const { id, employeeId } = req.params;

  const assignment = await EmployeeStore.findAll({where:{employee_id:employeeId}})


  const user = await User.findByPk(employeeId, {
    include: [
      {
        model: Recyclery,
        as: "stores",
        through: { attributes: ["is_primary"] },
      },
    ],
  });
const employeeStores = await EmployeeStore.findAll({
  where: {
    employee_id: employeeId,
  },
  attributes: [
    "employee_id",
    "store_id",
    // cast boolean to integer
    [cast(col("is_primary"), "INTEGER"), "is_primary"],
    "createdAt",
    "updatedAt",
  ],
  include: [
    {
      model: Recyclery,
      attributes: [
        ["name", "store_name"],
        ["address", "store_address"],
      ],
      required: false, // LEFT JOIN
    },
  ],
  order: [
    [literal('"is_primary" DESC')],      // order primary first
    [Recyclery, "name", "ASC"],             // then by store name
  ],
  raw: true, // return plain objects
});


  // if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  res.json({
    success: true,
    assignments:employeeStores,
    stores:user
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listStoreEmployee = async (req, res) => {
  const { storeId, role } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (storeId) where.recyclery_id = storeId;
  if (role) where.role = role;

  const users = await User.findAll({
    where,
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
    ],
  });

  res.json({ users });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const assignUserToStore = async (req, res) => {
  const { employee_id, store_id, is_primary = false } = req.body;

  if (!employee_id || !store_id) {
    return res.status(400).json({
      success: false,
      error: "employee_id et store_id sont requis",
    });
  }

  // Vérifier que l'employé et le magasin existent
  const employee = await User.findByPk(employee_id, {
    include: [{ model: Recyclery, as: "stores" }],
  });

  if (!employee) {
    return res.status(404).json({
      success: false,
      error: "Employé non trouvé",
    });
  }
  const store = await Recyclery.findByPk(store_id);

  if (!store) {
    return res.status(404).json({
      success: false,
      error: "Magasin non trouvé",
    });
  }

  const niquetoi = await EmployeeStore.create({
    employee_id: employee.id,
    store_id: store.id,
    is_primary,
  });

  // // Si c'est une affectation principale, retirer le statut principal des autres affectations de cet employé
  if (is_primary) {
  //   await database.run(
  //     "UPDATE employee_stores SET is_primary = 0 WHERE employee_id = ?",
  //     [employee_id]
  //   );
  // }
    await sequelize.transaction(async (t) => {
    for (const store of employee.stores) {
      await employee.addStore(store, {
        through: { is_primary: store.id === store_id },
        transaction: t,
      });
    }
  });
}

  // await employee.addStore(store);
  // const result = await database.run(
  //   `
  //   INSERT INTO employee_stores (employee_id, store_id, is_primary, created_at, updated_at)
  //   VALUES (?, ?, ?, datetime('now'), datetime('now'))
  // `,
  //   [employee_id, store_id, is_primary ? 1 : 0]
  // );

  res.status(201).json({
    success: true,
    message: "Affectation créée avec succès",
    assignment_id: niquetoi.id,
    employee,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const removeEmployeeStore = async (req, res) => {
  const { employeeId } = req.params;
  const employee = await User.findByPk(employeeId, {
    include: [{ model: Recyclery, as: "stores" }],
  });
  await employee.setStores([]);
  // const result = await EmployeeStore.destroy(employeeId);

  res.json({
    success: true,
    message: ` affectation(s) supprimée(s) avec succès`,
  });
};
