import {
  employeeDataSchema,
  employeeSkillsSchema,
} from "@recyclerie/api/schemas/employees";
import type {
  CreateEmployeeResponse,
  DeleteEmployeeResponse,
  DetailEmployeeResponse,
  ListEmployeesResponse,
  UpdateEmployeeResponse,
  UpdateEmployeeSkillsResponse,
} from "@recyclerie/api/responses/employees";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { toEmployeeDto } from "../../mappers/employees.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";

const { Employee, Recyclery, EmployeeWorkdays, Skill } = db;

export const listEmployees = async (_req: Request, res: Response) => {
  const rows = await Employee.findAll({
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
      {
        model: EmployeeWorkdays,
      },
    ],
  });

  res.json(
    apiData(rows.map(toEmployeeDto)) satisfies ListEmployeesResponse,
  );
};

export const detailEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const row = await findByPkOrThrow(Employee, id, "employée pas trouvé", {
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

  res.json(
    apiData(toEmployeeDto(row)) satisfies DetailEmployeeResponse,
  );
};

export const createEmployee = async (req: Request, res: Response) => {
  const data = employeeDataSchema.parse(req.body);
  const employee = await Employee.create({
    ...data,
  });
  res.status(201).json(
    apiCreated(toEmployeeDto(employee), {
      message: "employee ajouté",
    }) satisfies CreateEmployeeResponse,
  );
};

export const updateEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = employeeDataSchema.parse(req.body);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.update({
    ...data,
    isActive: data.isActive ?? employee.isActive,
  });
  res.json(
    apiData(toEmployeeDto(employee), {
      message: "employee mis à jour",
    }) satisfies UpdateEmployeeResponse,
  );
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.destroy();
  res.json(
    apiMessage("employee supprimé") satisfies DeleteEmployeeResponse,
  );
};

export const updateEmployeeSkills = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  const data = employeeSkillsSchema.parse(req.body);
  await employee.setSkills(data.skills);
  res.json(
    apiMessage("skills mis a jour") satisfies UpdateEmployeeSkillsResponse,
  );
};
