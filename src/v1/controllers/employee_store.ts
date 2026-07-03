import {
  assignEmployeeStoreSchema,
  employeeStoreParamsSchema,
  removeEmployeeStoreParamsSchema,
} from "@recyclerie/api/schemas/employeeStore";
import type {
  AssignEmployeeStoreResponse,
  EmployeeStoreByEmployeeResponse,
  ListEmployeeStoreResponse,
  ListStoreEmployeesResponse,
  RemoveEmployeeStoreResponse,
} from "@recyclerie/api/responses/employeeStore";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";
import type { Includeable } from "sequelize";

import db from "../../models/index.js";
import {
  toEmployeeStoreAssignmentDto,
  toEmployeeWithStoreAssignmentsDto,
} from "../../mappers/employeeStore.js";
import { toEmployeeDto } from "../../mappers/employees.js";

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

  res.json(
    apiData(
      assignments.map(toEmployeeWithStoreAssignmentsDto),
    ) satisfies ListEmployeeStoreResponse,
  );
};

export const getEmployeeStoreById = async (req: Request, res: Response) => {
  const { employeeId } = employeeStoreParamsSchema.parse(req.params);

  const employee = await findByPkOrThrow(
    Employee,
    employeeId,
    "Utilisateur non trouvé",
    {
      include: [
        {
          model: Recyclery,
          as: "stores",
          through: {
            attributes: ["is_primary"],
          },
        },
      ],
    },
  );

  const stores = employee?.stores || [];
  const data = stores.map((s) => toEmployeeStoreAssignmentDto(s));
  res.json(apiData(data) satisfies EmployeeStoreByEmployeeResponse);
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

  res.json(
    apiData(users.map(toEmployeeDto)) satisfies ListStoreEmployeesResponse,
  );
};

export const assignUserToStore = async (req: Request, res: Response) => {
  const data = assignEmployeeStoreSchema.parse(req.body);

  // Vérifier que l'employé et le magasin existent
  const employee = await findByPkOrThrow(Employee, data.employee_id, "Employé non trouvé", {
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
    ],
  });
  const store = await findByPkOrThrow(Recyclery, data.store_id, "Magasin non trouvé");

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

  res
    .status(201)
    .json(
      apiCreated(toEmployeeWithStoreAssignmentsDto(employee), {
        message: "Affectation créée avec succès",
      }) satisfies AssignEmployeeStoreResponse,
    );
};

export const removeEmployeeStore = async (req: Request, res: Response) => {
  const data = removeEmployeeStoreParamsSchema.parse(req.params);

  const employee = await findByPkOrThrow(
    Employee,
    data.employeeId,
    "Employé non trouvé",
  );

  if (data.store_id) {
    const store = await findByPkOrThrow(
      Recyclery,
      data.store_id,
      "Magasin non trouvé",
    );
    await employee.removeStore(store);
  } else {
    // Remove all store assignments
    // await employee.setStores([]);
    await EmployeeStore.destroy({ where: { employeeId: data.employeeId } });
  }
  res.json(
    apiMessage(`Affectation(s) supprimée(s) avec succès`) satisfies RemoveEmployeeStoreResponse,
  );
};
