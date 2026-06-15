import z from "zod";
import { idSchema, phoneSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";

const { Employee, Recyclery, EmployeeWorkdays, Skill } = db;

const dataSchema = z.object({
  nom: z.string("nom requis").trim().nonempty("nom requis"),
  prenom: z.string("prenom requis").trim().nonempty("prenom requis"),
  isActive: z.coerce.boolean().default(true),
  email: z.email().nullish().prefault(null),
  phone: phoneSchema().nullish().prefault(null),
});

export const listEmployees = async (_req: Request, res: Response) => {
  const data = await Employee.findAll({
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
      {
        model: EmployeeWorkdays,
        // as:"horaires"
      },
    ],
  });

  res.json({
    success: true,
    data,
  });
};

export const detailEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = await findByPkOrThrow(Employee, id, "employée pas trouvé", {
    include: [
      {
        model: Recyclery,
        as: "stores",
        required: false,
      },
      {
        model: EmployeeWorkdays,
        required: false,
      },
      {
        model: Skill,
        as: "skills",
        required: false,
      },
    ],
  });

  res.json({
    success: true,
    data,
  });
};

export const createEmployee = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const employee = await Employee.create({
    ...data,
  });
  res.status(201).json({
    success: true,
    message: "employee ajouté",
    data: employee,
  });
};

export const updateEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.update({
    ...data,
    isActive: data.isActive ?? employee.isActive,
  });
  res.json({
    success: true,
    message: "employee mis à jour",
    data: employee,
  });
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.destroy();
  res.json({
    success: true,
    message: "employee supprimé",
  });
};

export const updateEmployeeSkills = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  const dataSchema = z.object({ skills: z.array(idSchema()) });
  const data = dataSchema.parse(req.body);
  await employee.setSkills(data.skills);
  res.json({
    success: true,
    message: "skills mis a jour",
  });
};
