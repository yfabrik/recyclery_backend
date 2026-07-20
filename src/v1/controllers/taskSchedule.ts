import createHttpError from "http-errors";
import { col, fn, literal, Op } from "sequelize";
import {
  assignEmployeeToScheduleBodySchema,
  taskScheduleDataSchema,
  taskScheduleDateFilterSchema,
  taskScheduleFilterSchema,
} from "@recyclerie/api/schemas/taskSchedule";
import type {
  AssignEmployeeScheduleResponse,
  AvailableEmployeesResponse,
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

import { formatWhereDateRange } from "../../helpers.js";
import type { ModelWhere } from "../../models/db-types.js";
import { toAvailableEmployeeDto, toPlanningStatsDto, toTaskScheduleDto, type PlanningStatsOverviewRow } from "../../mappers/taskSchedule.js";
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
  const dayOfWeek = taskDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

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

export const findAvailableEMployee = async (req: Request, res: Response) => {
  const scheduleId = idSchema().parse(req.params.scheduleId);

  // Récupérer les détails de la tâche
  const schedule = await findByPkOrThrow(Task, scheduleId, "Tâche non trouvée", {
    include: [{ model: Employee }],
  });

  const currentSchedule = schedule;

  // Récupérer les employés du magasin ET présents ce jour-là
  // Si pas de store_id, afficher tous les employés présents
  let allEmployees;

  // Déterminer le jour de la semaine de la tâche
  const taskDate = new Date(currentSchedule.scheduled_date);
  const dayOfWeek = taskDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const newYear = new Date(taskDate.getFullYear(), 0, 1);
  const dayNumber = Math.floor((+taskDate - +newYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((taskDate.getDay() + 1 + dayNumber) / 7);
  if (!schedule.store_id)
    allEmployees = await Employee.findAll({
      include: [
        {
          model: EmployeeWorkdays,
          // as:"horaires",
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: true, // or 1
            week: weekNumber % 2 ? "week2" : "week1",
          },
        },
      ],
    });
  else
    allEmployees = await Employee.findAll({
      include: [
        {
          model: EmployeeWorkdays,
          // as:"horaires",
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: true, // or 1
            week: weekNumber % 2 ? "week2" : "week1",
          },
        },
        {
          model: Recyclery,
          as: "stores",
          where: { id: schedule.store_id },
          required: true,
        },
      ],
    });

  // Pour chaque employé, vérifier s'il est disponible
  const availableEmployees = [];

  const start = new Date(currentSchedule.scheduled_date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(currentSchedule.scheduled_date);
  end.setHours(23, 59, 59, 999);

  for (const employee of allEmployees) {
    // Vérifier les conflits d'horaires pour cet employé

    const conflicts = await Task.findAll({
      where: {
        // assigned_to: employee.id,
        scheduled_date: { [Op.between]: [start, end] },
        id: { [Op.ne]: scheduleId },

        // start_time: { [Op.lt]: currentSchedule.end_time },
        // end_time: { [Op.gt]: currentSchedule.start_time },
      },
      include: [
        {
          model: Employee,
          where: { id: employee.id },
          required: true,
        },
      ],
    });
    const toMinutes = (v: Date | number) => {
      const d = v instanceof Date ? v : new Date(v);
      return d.getHours() * 60 + d.getMinutes();
    };
    const newStart = toMinutes(schedule.start_time);
    const newEnd = toMinutes(schedule.end_time);

    const hasOverlap = conflicts.filter((e) => {
      if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
      const start = toMinutes(e.start_time);
      const end = toMinutes(e.end_time);
      return start < newEnd && end > newStart;
    });

    // Vérifier si l'employé est déjà assigné à cette tâche
    //FIXME
    // const alreadyAssigned = await TaskSchedule.findAll({
    //   // where: { schedule_id: scheduleId, employee_id: employee.id },
    // });

    availableEmployees.push({
      ...employee.get({ plain: true }),
      is_available: hasOverlap.length === 0,
      has_conflicts: hasOverlap.length > 0,
      conflicts: hasOverlap,
      already_assigned: schedule.Employees?.some((u) => u.id == employee.id),
    });
  }

  res.json(
    apiData(
      availableEmployees.map((employee) =>
        toAvailableEmployeeDto({
          ...employee,
          already_assigned: Boolean(employee.already_assigned),
        }),
      ),
    ) satisfies AvailableEmployeesResponse,
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
