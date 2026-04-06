import createHttpError from "http-errors";
import { Op, type Attributes, type Includeable, type WhereOptions } from "sequelize";
import * as z from "zod";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import Employee from "../../models/employee.js";
import Recyclery from "../../models/recyclery.js";
import Task from "../../models/task.js";
import { formatWhereDateRange } from "../../helpers.js";
import TaskSchedule from "../../models/taskschedule.js";


const dataSchema = z.object({
  name: z.string("Nom requis"),
  description: z.string().nullish().prefault(null),
  category: z.enum(
    ["point", "vente", "collection", "custom"],
    "categorie requise",
  ),
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
  recurrence_pattern: z.enum(["daily", "weekly", "monthly"]).nullish().prefault(null),
  assigned_to: idSchema().nullish(),
  notes: z.string().nullish().prefault(null),
  start_time: z.coerce.date().optional().default(new Date()),
  end_time: z.coerce.date().optional().default(new Date()),
  scheduled_date: z.coerce.date().optional().default(new Date()),
  store_id: idSchema().nullish().prefault(null),
});


export const listTasks = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["user", "store"];
  const includeSchema = z.object({
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
    category: z
      .enum(["point", "vente", "collection", "custom"])
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


  const where: WhereOptions<Attributes<Task>> = {};
  where.scheduled_date = formatWhereDateRange(data.date_from, data.date_to)


  if (data.category) where.category = data.category;

  if (data.priority && data.priority !== "all") where.priority = data.priority;

  if (data.search)
    where[Op.or] = [
      { name: { [Op.like]: data.search } },
      { description: { [Op.like]: data.search } },
    ];
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
  const id = idSchema().parse(req.params.id)
  const tasks = await Task.findByPk(id);

  if (!tasks) throw new createHttpError[404]("Tâche non trouvée");

  // Parser les champs JSON
  const task = {
    ...tasks[0],
    required_skills: tasks[0]?.required_skills
      ? JSON.parse(tasks[0].required_skills)
      : [],
    equipment_needed: tasks[0]?.equipment_needed
      ? JSON.parse(tasks[0].equipment_needed)
      : [],
  };

  res.json({
    success: true,
    task: tasks,
  });
};

export const createTask = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  let name = data.name ?? data.category;
  if (data.store_id && data.category == "custom") {
    const store = await Recyclery.findByPk(data.store_id);
    if (!store) throw new createHttpError.NotFound("magasin non trouvé");
    name = store.name + "-" + name;
  }

  let schedule = null;
  if (data.recurrence_pattern) {
    schedule = await TaskSchedule.create({
      ...data,
      name,
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
  const existing = await Task.findByPk(id);

  if (!existing) throw new createHttpError[404]("Tâche non trouvée");

  let name = data.name ?? data.category;

  if (data.store_id && data.category == "custom") {
    const store = await Recyclery.findByPk(data.store_id);
    if (!store) throw new createHttpError.NotFound("magasin non trouvé");
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

  const existing = await Task.findByPk(id);
  if (!existing) throw new createHttpError[404]("Tâche non trouvée");
  await existing.destroy();

  res.json({
    success: true,
    message: "Tâche supprimée avec succès",
  });
};


export const getUsersFromTask = async (req: Request, res: Response) => {
  //TODO use the detail task with query param ?
  const taskId = idSchema().parse(req.params.taskId);

  const tasks = await Task.findByPk(taskId, { include: [{ model: Employee }] });
  if (!tasks) throw new createHttpError.NotFound("tache non trouvé");
  res.json({
    success: true,
    employees: tasks.Employees,
  });
};


export const addUserToTask = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const employee_id = idSchema("ID employé requis").parse(req.body.employee_id);


  const task = await Task.findByPk(taskId);

  // Vérifier que la tâche existe

  if (!task) throw new createHttpError[404]("Tâche non trouvée");

  // Vérifier que l'employé existe
  const employee = await Employee.findByPk(employee_id);

  if (!employee) throw new createHttpError[404]("Employé non trouvé");

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

  const task = await Task.findByPk(taskId);
  if (!task) throw new createHttpError[404]("Tâche non trouvée");
  await task.removeEmployee(employeeId);

  res.json({
    success: true,
    message: "Employé retiré avec succès",
  });
};
