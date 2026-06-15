import createHttpError from "http-errors";
import z from "zod";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import type { Includeable } from "sequelize";

import db from "../../models/index.js";

const { sequelize, Employee, Recyclery, EmployeeStore } = db;

export const listEmployeeStore = async (_req: Request, res: Response) => {
  const assignments = await Employee.findAll({
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

  res.json({
    success: true,
    assignments,
  });
};

export const getEmployeeStoreById = async (req: Request, res: Response) => {
  const params = z.object({
    employeeId: idSchema("employee id requis"),
  });
  const { employeeId } = params.parse(req.params);

  const employee = await Employee.findByPk(employeeId, {
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

  if (!employee) throw new createHttpError.NotFound("Utilisateur non trouvé");

  const stores = employee?.stores || [];
  const assignments = stores.map((s) => {
    const values = s.dataValues;
    return { ...values, is_primary: s.EmployeeStore.is_primary };
  });
  res.json({
    success: true,
    assignments,
    stores: employee.stores,
  });
};

export const listStoreEmployee = async (req: Request, res: Response) => {
  const storeId = idSchema().parse(req.query.storeId);

  const include: Includeable[] = [
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

export const assignUserToStore = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    employee_id: idSchema("employee_id est requis"),
    store_id: idSchema("store_id est requis"),
    is_primary: z.boolean().optional().default(false),
  });
  const data = dataSchema.parse(req.body);

  // Vérifier que l'employé et le magasin existent
  const employee = await Employee.findByPk(data.employee_id, {
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
    ],
  });

  if (!employee) throw new createHttpError[404]("Employé non trouvé");
  const store = await Recyclery.findByPk(data.store_id);

  if (!store) throw new createHttpError[404]("Magasin non trouvé");

  await sequelize.transaction(async (t) => {
    // Si c'est une affectation principale, retirer le statut principal des autres affectations de cet employé

    //géré dans le modèle
    // if (data.is_primary) {
    //   // Update all existing assignments to set is_primary to false
    //   await EmployeeStore.update(
    //     { is_primary: false },
    //     {
    //       where: { employee_id: employee_id },
    //       transaction: t,
    //     }
    //   );
    // }

    // Add or update the store assignment
    await employee.addStore(store, {
      through: { is_primary: data.is_primary },
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

export const removeEmployeeStore = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    employeeId: idSchema("employee_id est requis"),
    store_id: idSchema().nullish(),
  });
  const data = dataSchema.parse(req.params);

  const employee = await Employee.findByPk(data.employeeId);
  if (!employee) {
    throw new createHttpError[404]("Employé non trouvé");
  }

  if (data.store_id) {
    // Remove specific store assignment
    const store = await Recyclery.findByPk(data.store_id);
    if (!store) {
      throw new createHttpError[404]("Magasin non trouvé");
    }
    await employee.removeStore(store);
  } else {
    // Remove all store assignments
    // await employee.setStores([]);
    await EmployeeStore.destroy({ where: { employeeId: data.employeeId } });
  }
  const emplo = await Employee.findByPk(data.employeeId, {
    include: [{ model: Recyclery, as: "stores" }],
  });
  console.log(emplo);

  res.json({
    success: true,
    message: `Affectation(s) supprimée(s) avec succès`,
  });
};
