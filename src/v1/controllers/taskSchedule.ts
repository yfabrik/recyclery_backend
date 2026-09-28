import createHttpError from "http-errors";
import { col, fn, literal } from "sequelize";
import {
  assignEmployeeToScheduleBodySchema,
  taskScheduleDataSchema,
  taskScheduleDateFilterSchema,
  taskScheduleFilterSchema,
} from "@recyclerie/api/schemas/taskSchedule";
import type {
  AssignEmployeeScheduleResponse,
  CreateTaskScheduleResponse,
  DeleteTaskScheduleResponse,
  DetailTaskScheduleResponse,
  EmployeeScheduleResponse,
  ListTaskSchedulesResponse,
  PlanningStatsResponse,
  UpdateTaskScheduleResponse,
} from "@recyclerie/api/responses/taskSchedule";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import { weekday } from "../../utils/dates.js";

import { formatWhereDateRange } from "../../helpers.js";
import type { ModelWhere } from "../../models/db-types.js";
import { toPlanningStatsDto, toTaskScheduleDto, type PlanningStatsOverviewRow } from "../../mappers/taskSchedule.js";
import { toTaskDto } from "../../mappers/tasks.js";

const { Recyclery, Task, TaskSchedule, Employee, EmployeeWorkdays } = db;

export const listSchedules = async (req: Request, res: Response) => {
  const category =
    req.originalUrl == "/api/collection-point-presence"
      ? "point"
      : req.originalUrl == "/api/store-hours"
        ? "vente"
        : req.originalUrl == "/api/collections"
          ? "collection"
          : req.query?.category;

  const filter = taskScheduleFilterSchema.parse({ ...req.query, category });

  const where: ModelWhere<typeof TaskSchedule> = {};

  const dateRange = formatWhereDateRange(filter.start_date, filter.end_date);
  if (dateRange) where.scheduled_date = dateRange;

  // if (filter.employee_id) {
  //   where.assigned_to = filter.employee_id;
  // }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.store_id) {
    where.store_id = filter.store_id;
  }

  const include = [
    {
      model: Task,
      // attributes: [],
      // required: false, // LEFT JOIN
    },
    // {
    //   model: User,
    //   attributes: [],
    //   required: false,
    // },
    {
      model: Recyclery,
      attributes: [],
      required: false,
    },
  ];
  if (filter.category == "collection") {
    where.category = filter.category;
    // include.push({ model: CollectionPoint })
  }
  if (filter.category == "vente") {
    where.category = filter.category;
  }
  if (filter.category == "point") {
    where.category = filter.category;
    // include.push({ model: Recyclery })
  }
  if (filter.category == "custom") {
    where.category = filter.category;
    // include.push({ model: Recyclery })
  }

  const schedules = await TaskSchedule.findAll({
    where,

    include,

    order: [
      ["scheduled_date", "ASC"],
      ["start_time", "ASC"],
    ],
  });

  res.json(
    apiData(schedules.map(toTaskScheduleDto)) satisfies ListTaskSchedulesResponse,
  );
};

export const findSchedule = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const schedules = await findByPkOrThrow(
    TaskSchedule,
    id,
    "Planning non trouvé",
    {
      attributes: {
        include: [
          [
            fn("COALESCE", col("Employee.nom"), "Utilisateur inconnu"),
            "employee_name",
          ],
        ],
      },
      include: [
        { model: Employee },
        {
          model: Task,
        },
      ],
    },
  );

  res.json(
    apiData(toTaskScheduleDto(schedules)) satisfies DetailTaskScheduleResponse,
  );
};

export const createSchedule = async (req: Request, res: Response) => {
  const data = taskScheduleDataSchema.parse(req.body);
  const schedule = await db.sequelize.transaction(async (t) => {
    return TaskSchedule.create(
      { ...data, name: data.name ?? data.category },
      { transaction: t },
    );
  });

  res
    .status(201)
    .json(
      apiCreated(toTaskScheduleDto(schedule), {
        message: "Planning créé avec succès",
      }) satisfies CreateTaskScheduleResponse,
    );
};

export const updateSchedule = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = taskScheduleDataSchema.parse(req.body);

  // Vérifier que le planning existe
  const existingSchedules = await findByPkOrThrow(
    TaskSchedule,
    id,
    "Planning non trouvé",
  );

  if (!data.name) data.name = data.category;
  await db.sequelize.transaction(async (t) => {
    await existingSchedules.update(
      { ...data, name: data.name ?? data.category },
      { transaction: t },
    );
  });

  res.json(
    apiMessage("Planning mis à jour avec succès") satisfies UpdateTaskScheduleResponse,
  );
};

export const deleteSchedule = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const scheduleToDelete = await findByPkOrThrow(
    TaskSchedule,
    id,
    "Planning non trouvé",
  );
  await db.sequelize.transaction(async (t) => {
    await scheduleToDelete.destroy({ transaction: t });
  });

  res.json(
    apiMessage("Planning supprimé avec succès") satisfies DeleteTaskScheduleResponse,
  );
};

export const getEmployeeSchedule = async (req: Request, res: Response) => {
  // const employee_id = idSchema().parse(req.params.employee_id);

  const { start_date, end_date } = taskScheduleDateFilterSchema.parse(
    req.query,
  );

  const where: ModelWhere<typeof TaskSchedule> = {};
  const dateRange = formatWhereDateRange(start_date, end_date);
  if (dateRange) where.scheduled_date = dateRange;

  // where.assigned_to = employee_id;

  const schedules = await TaskSchedule.findAll({
    where,
    include: [{ model: Task }],
    order: [
      ["scheduled_date", "ASC"],
      ["start_time", "ASC"],
    ],
  });

  res.json(
    apiData(schedules.map(toTaskScheduleDto)) satisfies EmployeeScheduleResponse,
  );
};

/**
 * @deprecated Bypasses Time range validation (creates an Assignment with no
 * range at all). Use `POST /api/tasks/:id/employees` instead. Kept only for
 * whatever still calls the deprecated `/api/planning/:scheduleId/employees`.
 */
export const addEmployeeToSchedule = async (req: Request, res: Response) => {
  const scheduleId = idSchema("ID tâche du planning requis").parse(
    req.params.scheduleId,
  );

  const { employee_id } = assignEmployeeToScheduleBodySchema.parse(req.body);

  // Vérifier que la tâche du planning existe et récupérer ses détails
  const task = await findByPkOrThrow(Task, scheduleId, "Tâche du planning non trouvée", {
    include: [{ model: Employee }],
  });

  const currentSchedule = task;

  // Déterminer le jour de la semaine de la tâche
  const taskDate = new Date(currentSchedule.scheduled_date);
  const dayOfWeek = weekday(taskDate);

  // Vérifier que l'employé existe, appartient au bon magasin ET est présent ce jour-là
  const employee = await Employee.findOne({
    where: { id: employee_id },
    include: [
      {
        model: Recyclery,
        as: "stores",
        where: currentSchedule.store_id
          ? { store_id: currentSchedule.store_id }
          : {},
      },
      {
        model: EmployeeWorkdays,
        // as:"horaires",
        where: { day_of_week: dayOfWeek },
      },
    ],
  });

  if (!employee)
    throw new createHttpError[404](
      `Employé non trouvé, n'appartient pas à ce magasin ou ne travaille pas le ${dayOfWeek}`,
    );

  // Vérifier si l'assignation existe déjà
  //TODO check dans le model
  if (task.Employees?.some((e) => e.id === employee.id))
    throw new createHttpError.Conflict(
      "Cet employé est déjà assigné à cette tâche",
    );

  // Créer l'assignation
  await task.addEmployee(employee);

  res.json(
    apiData(toTaskDto(task), {
      message: "Employé assigné avec succès",
    }) satisfies AssignEmployeeScheduleResponse,
  );
};

/**
 * @deprecated Bypasses Time range validation (removes the Assignment without
 * regard for its ranges). Use `DELETE /api/tasks/:id/employees/:employeeId`
 * instead. Kept only for whatever still calls the deprecated
 * `/api/planning/:scheduleId/employees`.
 */
export const removeEmployeeFromSchedule = async (
  req: Request,
  res: Response,
) => {
  const scheduleId = idSchema("ID tâche du planning requis").parse(
    req.params.scheduleId,
  );
  const employeeId = idSchema("ID employé requis").parse(req.params.employeeId);

  const result = await findByPkOrThrow(
    Task,
    scheduleId,
    "Assignation non trouvée",
    { include: [{ model: Employee }] },
  );

  await result.removeEmployee(employeeId);
  // const result = await TaskSchedule.destroy({
  //   // where: { schedule_id: scheduleId, employee_id: employeeId },
  // });

  res.json(
    apiMessage("Employé retiré avec succès") satisfies DeleteTaskScheduleResponse,
  );
};

export const planningStats = async (req: Request, res: Response) => {
  const { start_date, end_date } = taskScheduleDateFilterSchema.parse(
    req.query,
  );

  const where: ModelWhere<typeof TaskSchedule> = {};
  const dateRange = formatWhereDateRange(start_date, end_date);
  if (dateRange) where.scheduled_date = dateRange;
  // Statistiques générales

  const stats = await TaskSchedule.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_schedules"],

      [
        fn("SUM", literal(`CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END`)),
        "scheduled_count",
      ],

      [
        fn(
          "SUM",
          literal(`CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END`),
        ),
        "in_progress_count",
      ],

      [
        fn("SUM", literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)),
        "completed_count",
      ],

      [
        fn("SUM", literal(`CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END`)),
        "cancelled_count",
      ],
    ],
    raw: true,
  });

  // Tâches les plus planifiées
  const topTasks = await TaskSchedule.findAll({
    attributes: {
      include: [[fn("COUNT", col("*")), "schedule_count"]],
    },
    include: [{ model: Task }],
    group: [col("Task.id"), col("Task.name"), col("Task.category")],
    order: ["scheduled_count", "DESC"],
    limit: 5,
  });

  // Employés les plus occupés
  const topEmployees = await TaskSchedule.findAll({
    attributes: [
      [
        fn("COALESCE", col("Employee.nom"), "Utilisateur inconnu"),
        "employee_name",
      ],
      [fn("COUNT", col("*")), "schedule_count"],
    ],
    include: [{ model: Employee }],
    group: [
      col("Employee.id"),
      // [Employee, "nom"],
    ],
    order: ["schedule_count", "DESC"],
    limit: 5,
  });

  res.json(
    apiData(
      toPlanningStatsDto({
        overview: stats as PlanningStatsOverviewRow | null,
        topTasks: topTasks as unknown as Array<Record<string, unknown>>,
        topEmployees: topEmployees as unknown as Array<Record<string, unknown>>,
      }),
    ) satisfies PlanningStatsResponse,
  );
};
