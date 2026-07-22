import { employeeWorkdaysBulkSchema } from "@recyclerie/api/schemas/employeeWorkdays";
import type {
  CreateEmployeeWorkdaysResponse,
  ListEmployeeWorkdaysResponse,
} from "@recyclerie/api/responses/employeeWorkdays";
import { apiData, apiMessage } from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";
import { literal } from "sequelize";
import db from "../../models/index.js";
import { toEmployeeWorkdayDto } from "../../mappers/employeeWorkdays.js";

const { EmployeeWorkdays, Employee } = db;

export const listEmployeeWorkdays = async (req: Request, res: Response) => {
  const employeeId = idSchema().parse(req.params.employeeId);

  const workdays = await EmployeeWorkdays.findAll({
    where: { employee_id: employeeId },
    // Monday-first: Mon=0 … Sun=6 via ((day_of_week + 6) % 7)
    order: [[literal("((day_of_week + 6) % 7)"), "ASC"]],
  });

  res.json(
    apiData(workdays.map(toEmployeeWorkdayDto)) satisfies ListEmployeeWorkdaysResponse,
  );
};

export const createEmployeeWorkdays = async (req: Request, res: Response) => {
  const { workdays } = employeeWorkdaysBulkSchema.parse(req.body);
  const employeeId = idSchema().parse(req.params.employeeId);

  const employee = await findByPkOrThrow(
    Employee,
    employeeId,
    "Employé non trouvé",
    {
      include: [
        {
          model: EmployeeWorkdays,
        },
      ],
    },
  );

  await db.sequelize.transaction(async (t) => {
    await EmployeeWorkdays.destroy({
      where: { employee_id: employee.id },
      transaction: t,
    });
    // await employee.removeHoraires();
    const workdayToCreate = workdays.map((workday) => ({
      employee_id: employeeId,
      ...workday,
    }));
    await EmployeeWorkdays.bulkCreate(workdayToCreate, { transaction: t });
  });

  res.json(
    apiMessage("Jours de travail mis à jour avec succès") satisfies CreateEmployeeWorkdaysResponse,
  );
};
