import z from "zod";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import db from "../../models/index.js";
import createHttpError from "http-errors";

const { EmployeeWorkdays, Employee } = db;

export const listEmployeeWorkdays = async (req: Request, res: Response) => {
  const employeeId = idSchema().parse(req.params.employeeId);

  const workdays = await EmployeeWorkdays.findAll({
    where: { employee_id: employeeId },
  });

  res.json({
    success: true,
    workdays,
  });
};

export const createEmployeeWorkdays = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    day_of_week: z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    time_slot: z.enum(["morning", "afternoon"]),
    is_working: z.boolean(),
    start_time: z.iso.time(),
    end_time: z.iso.time(),
    notes: z.string().nullish(),
    week: z.string().regex(/^week[1-9]$/, "week format incorrect"),
  });
  const schema = z.object({
    workdays: z.array(dataSchema, "workdays doit être un tableau"),
  });

  const { workdays } = schema.parse(req.body);
  const employeeId = idSchema().parse(req.params.employeeId);

  // Vérifier que l'employé existe
  const employee = await Employee.findByPk(employeeId, {
    include: [
      {
        model: EmployeeWorkdays,
        // as: "horaires"
      },
    ],
  });

  if (!employee) throw new createHttpError.NotFound("Employé non trouvé");

  // Supprimer les anciens jours de travail de cet employé
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
  res.json({
    success: true,

    message: "Jours de travail mis à jour avec succès",
  });
};
