import createHttpError from "http-errors";
import db from "../../models/index.js";
import { cast, col, literal, Op } from "sequelize";
const { Recyclery, sequelize, EmployeeStore, Employee } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listEmployeeStore = async (req, res) => {
  const assignments = await Employee.findAll({
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
    ],
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

  const user = await Employee.findByPk(employeeId, {
    include: [
      {
        model: Recyclery,
        as: "stores",
        through: {
          attributes: ["is_primary"],
        },
        // through: { attributes: ["is_primary"] },
      },
    ],
  });
  // const employeeStores = await EmployeeStore.findAll({
  //   where: {
  //     employeeId: employeeId,
  //   },
  //   // attributes: [
  //   //   "employeeId",
  //   //   "RecycleryId",
  //   //   // cast boolean to integer
  //   //   [cast(col("is_primary"), "INTEGER"), "is_primary"],
  //   //   "createdAt",
  //   //   "updatedAt",
  //   //   [col("Recyclery.name"), "store_name"],
  //   //   [col("Recyclery.address"), "store_address"],
  //   // ],
  //   include: [
  //     {
  //       model: Recyclery,
  //       attributes: [
  //         // ["name", "store_name"],
  //         // ["address", "store_address"],
  //       ],
  //       required: false, // LEFT JOIN
  //     },
  //   ],
  //   order: [
  //     // [literal('"is_primary" DESC')], // order primary first
  //     // [Recyclery, "name", "ASC"], // then by store name
  //   ],
  //   raw: true, // return plain objects
  // });

  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  const stores = user.get({ plain: true }).stores;
  const assignments = stores.map((s) => {
    return { ...s, is_primary: s.EmployeeStore.is_primary };
  });
  res.json({
    success: true,
    assignments,
    stores: user.stores,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listStoreEmployee = async (req, res) => {
  const { storeId } = req.query;

  const include = [
    {
      model: Recyclery,
      as: "stores",
      ...(storeId && {
        where: { id: storeId },
        required: true, // INNER JOIN to filter only employees assigned to this store
      }),
    },
  ];

  const users = await Employee.findAll({
    include,
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
  const employee = await Employee.findByPk(employee_id, {
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
    ],
  });
  console.log(employee);

  if (!employee) throw new createHttpError[404]("Employé non trouvé");
  const store = await Recyclery.findByPk(store_id);

  if (!store) throw new createHttpError[404]("Magasin non trouvé");

  await sequelize.transaction(async (t) => {
    // Si c'est une affectation principale, retirer le statut principal des autres affectations de cet employé
    if (is_primary) {
      // Update all existing assignments to set is_primary to false
      await EmployeeStore.update(
        { is_primary: false },
        {
          where: { employee_id: employee_id },
          transaction: t,
        },
      );
    }

    // Add or update the store assignment
    await employee.addStore(store, {
      through: { is_primary: is_primary },
      transaction: t,
    });
  });

  // Reload employee with updated store associations
  await employee.reload({
    include: [
      {
        model: Recyclery,
        as: "stores",
        through: {
          attributes: ["is_primary"],
        },
      },
    ],
  });

  res.status(201).json({
    success: true,
    message: "Affectation créée avec succès",
    employee,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeEmployeeStore = async (req, res) => {
  const { employeeId, storeId } = req.params;

  if (!employeeId) {
    return res.status(400).json({
      success: false,
      error: "employeeId est requis",
    });
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new createHttpError[404]("Employé non trouvé");
  }

  if (storeId) {
    // Remove specific store assignment
    const store = await Recyclery.findByPk(storeId);
    if (!store) {
      throw new createHttpError[404]("Magasin non trouvé");
    }
    await employee.removeStore(store);
  } else {
    // Remove all store assignments
    await employee.setStores([]);
  }

  res.json({
    success: true,
    message: `Affectation(s) supprimée(s) avec succès`,
  });
};
