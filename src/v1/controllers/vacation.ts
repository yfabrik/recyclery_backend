import { apiCreated, apiData, apiMessage, idSchema, vacationBodySchema, type CreateVacationResponse, type DeleteVacationResponse, type ListVacationsResponse, type UpdateVacationResponse } from "@recyclerie/api";
import type { Request, Response } from "express";
import { toEmployeeVacationDto } from "../../mappers/vacations.js";
import db from "../../models/index.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

const { EmployeeVacation, Employee } = db;

export const listVacations = async (_req: Request, res: Response) => {
    const vacations = await EmployeeVacation.findAll();
    res.json(apiData(vacations.map(toEmployeeVacationDto)) satisfies ListVacationsResponse);
};

export const listEmployeeVacations = async (req: Request, res: Response) => {
    const employeeId = idSchema().parse(req.params.employeeId);
    const vacations = await EmployeeVacation.findAll({ where: { employee_id: employeeId } });
    res.json(apiData(vacations.map(toEmployeeVacationDto)) satisfies ListVacationsResponse);
};

export const createEmployeeVacation = async (req: Request, res: Response) => {
    const employeeId = idSchema().parse(req.params.employeeId);
    const data = vacationBodySchema.parse(req.body);
    const employee = await findByPkOrThrow(Employee, employeeId, "Employé non trouvé");
    const vacation = await employee.createVacation({
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        reason: data.reason,
        notes: data.notes
    });

    res.json(apiCreated(toEmployeeVacationDto(vacation)) satisfies CreateVacationResponse);
}

export const updateVacation = async (req: Request, res: Response) => {
    const id = idSchema().parse(req.params.id);

    const data = vacationBodySchema.parse(req.body);
    const toUpdate = await findByPkOrThrow(EmployeeVacation, id, "Vacation non trouvée");
    await toUpdate.update({
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        reason: data.reason, notes: data.notes
    });
    const vacation = await toUpdate.reload();
    res.json(apiData(toEmployeeVacationDto(vacation)) satisfies UpdateVacationResponse);
}

export const deleteVacation = async (req: Request, res: Response) => {
    const id = idSchema().parse(req.params.id);
    const toDelete = await findByPkOrThrow(EmployeeVacation, id, "Vacation non trouvée");
    await toDelete.destroy();
    res.json(apiMessage("Vacation supprimée avec succès") satisfies DeleteVacationResponse);
}