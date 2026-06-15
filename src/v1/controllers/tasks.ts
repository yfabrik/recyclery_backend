import type { Request, Response } from "express";
import { Op, type Includeable } from "sequelize";
import * as z from "zod";

import { formatWhereDateRange } from "../../helpers.js";

import {
  RECURRENCE_PATTERNS,
  TASK_CATEGORIES,
} from "../../constants/dbEnums.js";
import { enumSchema, idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { ModelWhere } from "../../models/db-types.ts";

import db from "../../models/index.js";

const { Task, TaskSchedule, Employee, Recyclery } = db;

const dataSchema = z.object({
  name: z.string("Nom requis"),
  description: z.string().nullish().prefault(null),
  category: enumSchema(TASK_CATEGORIES, "categorie requise"),
  priority: z.string("priorité requis"),
  // estimated_duration: z.coerce.number().nullish(),
  required_skills: z
    .array(z.string())
    .nullish()
    .default([])
    .transform((val) => JSON.stringify(val)),
  location: z.string().nullish().prefault(null),
  equipment_needed: z
    .array(z.string())
    .nullish()
    .default([])
    .transform((val) => JSON.stringify(val)),
  // hourly_rate: z.coerce.number().nullish(),
  is_recurring: z.coerce.boolean().optional(),
  recurrence_pattern: enumSchema(RECURRENCE_PATTERNS, "récurrence invalide")
    .nullish()
    .prefault(null),
  assigned_to: idSchema().nullish(),
  notes: z.string().nullish().prefault(null),
  start_time: z.coerce.date().optional().default(new Date()),
  end_time: z.coerce.date().optional().default(new Date()),
  scheduled_date: z.coerce.date().optional().default(new Date()),
  store_id: idSchema().nullish().prefault(null),
});

export const listTasks = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["user", "store"] as const;
  const includeSchema = z.object({
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
    category: enumSchema(TASK_CATEGORIES)
      .nullable()
      .optional()
      .default(
        req.originalUrl == "/api/collection-point-presence"
          ? "point"
          : req.originalUrl == "/api/store-hours"
            ? "vente"
            : req.originalUrl == "/api/collections"
              ? "collection"
              : null,
      ),
    priority: z.string().optional(),
    search: z.string().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    store_id: idSchema().nullish(),
  });
  // const category = req.originalUrl == '/api/collection-point-presence' ? "point" : req.originalUrl == '/api/store-hours' ? "vente" : req.originalUrl == '/api/collections' ? "collection" : null
  const data = includeSchema.parse({ ...req.query });

  const where: ModelWhere<typeof Task> = {};
  const dateRange = formatWhereDateRange(data.date_from, data.date_to);
  if (dateRange) where.scheduled_date = dateRange;

  if (data.category) where.category = data.category;

  if (data.priority && data.priority !== "all") where.priority = data.priority;

  if (data.search) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.like]: data.search } },
        { description: { [Op.like]: data.search } },
      ],
    } satisfies ModelWhere<typeof Task>);
  }
  if (data.store_id) where.store_id = data.store_id;

  const include: Includeable[] = [];
  if (data.include.includes("user"))
    include.push({
      model: Employee,
    });
  if (data.include.includes("store"))
    include.push({
      model: Recyclery,
      required: false,
    });

  const tasks = await Task.findAll({
    include,
    where,
    order: [["createdAt", "DESC"]],
  });

  const t = tasks.map((t) => {
    return {
      ...t.get({ plain: true }),

      start_time: t.start_time ? new Date(t.start_time) : null,
      end_time: t.end_time ? new Date(t.end_time) : null,
    };
  });

  // Parser les champs JSON
  // const parsedTasks = tasks.map((task) => ({
  //   ...task,
  //   required_skills: task.required_skills
  //     ? JSON.parse(task.required_skills)
  //     : [],
  //   equipment_needed: task.equipment_needed
  //     ? JSON.parse(task.equipment_needed)
  //     : [],
  // }));

  res.json({
    success: true,
    // tasksx: parsedTasks,
    tasks: t,
    presence_hours: t,
  });
};

export const detailTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const tasks = await findByPkOrThrow(Task, id, "Tâche non trouvée");

  // Parser les champs JSON
  // const task = {
  //   ...tasks,
  //   required_skills: tasks?.required_skills
  //     ? JSON.parse(tasks.required_skills)
  //     : [],
  //   equipment_needed: tasks?.equipment_needed
  //     ? JSON.parse(tasks.equipment_needed)
  //     : [],
  // };

  res.json({
    success: true,
    task: tasks,
  });
};

export const createTask = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  let name = data.name ?? data.category;
  let store;
  if (data.store_id) {
    store = await findByPkOrThrow(Recyclery, data.store_id, "magasin non trouvé");
  }
  if (store && data.category == "custom") {
    name = store.name + "-" + name;
  }

  if (data.recurrence_pattern) {
    const schedule = await db.sequelize.transaction(async (t) => {
      return TaskSchedule.create({ ...data, name }, { transaction: t });
    });
    const task = await schedule.getTasks();

    res.json({
      success: true,
      message: "Tâche créée avec succès",
      task: task[0],
    });
  } else {
    const { is_recurring, recurrence_pattern, ...rest } = data;
    const task = await Task.create({
      ...rest,
      status: "pending",
      name,
    });

    res.json({
      success: true,
      message: "Tâche créée avec succès",
      task,
    });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);
  // Vérifier que la tâche existe
  const existing = await findByPkOrThrow(Task, id, "Tâche non trouvée");

  let name = data.name ?? data.category;

  if (data.store_id && data.category == "custom") {
    const store = await findByPkOrThrow(
      Recyclery,
      data.store_id,
      "magasin non trouvé",
    );
    name = store.name + "-" + name;
  }

  await existing.update({
    ...data,
    name,
  });

  res.json({
    success: true,
    message: "Tâche mise à jour avec succès",
    task: existing,
  });
};

export const deleteTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const existing = await findByPkOrThrow(Task, id, "Tâche non trouvée");
  await existing.destroy();

  res.json({
    success: true,
    message: "Tâche supprimée avec succès",
  });
};

export const getUsersFromTask = async (req: Request, res: Response) => {
  //TODO use the detail task with query param ?
  const taskId = idSchema().parse(req.params.taskId);

  const tasks = await findByPkOrThrow(Task, taskId, "tache non trouvé", {
    include: [{ model: Employee }],
  });
  res.json({
    success: true,
    employees: tasks.Employees,
  });
};

export const addUserToTask = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const employee_id = idSchema("ID employé requis").parse(req.body.employee_id);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");

  const employee = await findByPkOrThrow(
    Employee,
    employee_id,
    "Employé non trouvé",
  );

  //FIXME
  // if (task.hasUser(employee))
  //   return res.status(400).json({
  //     success: false,
  //     message: "Cet employé est déjà assigné à cette tâche",
  //   });

  await task.addEmployee(employee);

  res.json({
    success: true,
    message: "Employé assigné avec succès",
  });
};

export const removeUserFromTask = async (req: Request, res: Response) => {
  const employeeId = idSchema().parse(req.params.employeeId);
  const taskId = idSchema().parse(req.params.taskId);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");
  await task.removeEmployee(employeeId);

  res.json({
    success: true,
    message: "Employé retiré avec succès",
  });
};
