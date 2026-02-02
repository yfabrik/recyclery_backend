import { Op } from "sequelize";
import db from "../../models/index.js";
import * as z from "zod";
import collection from "../../models/poubelle/collection.js";
import createHttpError from "http-errors";

const { Task, User, TaskSchedule, Employee } = db;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listTasks = async (req, res) => {
  const ALLOWED_INCLUDES = ["user", "comments", "project", "task"];
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
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
  });
  // const category = req.originalUrl == '/api/collection-point-presence' ? "point" : req.originalUrl == '/api/store-hours' ? "vente" : req.originalUrl == '/api/collections' ? "collection" : null
  const data = includeSchema.parse({ ...req.query });

  /**
   * @type {import("sequelize").WhereOptions<import("../../models/types/taskModel.js").TaskAttributes>}
   */
  const where = {};
  if (data.date_from || data.date_to) {
    where.scheduled_date = {};
    if (data.date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(data.date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.scheduled_date[Op.gte] = dateFrom;
    }
    if (data.date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(data.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.scheduled_date[Op.lte] = dateTo;
    }
  }

  if (data.category) where.category = data.category;

  if (data.priority && data.priority !== "all") where.priority = data.priority;

  if (data.search)
    where[Op.or] = [
      { name: { [Op.like]: data.search } },
      { description: { [Op.like]: data.search } },
    ];

  /**
   * @type {import("sequelize").FindOptions<import("../../models/types/taskModel.js").TaskAttributes>["include"]}
   */
  const include = [];
  if (data.include.includes("user"))
    include.push({
      model: Employee,
    });

  const tasks = await Task.findAll({
    include,
    where,
    order: [["createdAt", "DESC"]],
  });

  const t = tasks.map((t) => {
    return {
      ...t.get({ plain: true }),
      start_time: new Date(t.start_time),
      end_time: new Date(t.end_time),
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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailTask = async (req, res) => {
  const { id } = req.params;
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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createTask = async (req, res) => {
  const dataSchema = z.object({
    name: z.string("Nom requis").nullish(),
    description: z.string().nullish(),
    category: z.string("categorie requis"),
    priority: z.string("priorité requis"),
    // estimated_duration: z.coerce.number().nullish(),
    required_skills: z
      .array(z.string())
      .nullish()
      .default([])
      .transform((val) => JSON.stringify(val)),
    // location: z.string().optional(),
    equipment_needed: z
      .array(z.string())
      .nullish()
      .default([])
      .transform((val) => JSON.stringify(val)),
    // hourly_rate: z.coerce.number().nullish(),
    is_recurring: z.coerce.boolean().nullish(),
    recurrence_pattern: z.string().nullish(),
    assigned_to: z.string().nullish(),
    notes: z.string().nullish(),
    start_time: z.coerce.date().nullish(),
    end_time: z.coerce.date().nullish(),
    scheduled_date: z.coerce.date().optional().default(new Date()),
  });
  const data = dataSchema.parse(req.body);
  const name = data.name ?? data.category;
  let schedule = null;
  if (data.recurrence_pattern && data.recurrence_pattern != "none") {
    schedule = await TaskSchedule.create({
      ...data,
      name,
    });
  }
  const { is_recurring, recurrence_pattern, ...rest } = data;
  const task = await Task.create({
    ...rest,
    status: "a",
    schedule_id: schedule?.id || null,
    name,
  });

  res.json({
    success: true,
    message: "Tâche créée avec succès",
    task,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateTask = async (req, res) => {
  const id = z.coerce.number().parse(req.params.id);

  const dataSchema = z.object({
    name: z.string("Nom requis").nullish(),
    description: z.string().nullish(),
    category: z.string("categorie requis"),
    priority: z.string("priorité requis"),
    // estimated_duration: z.coerce.number().nullish(),
    required_skills: z
      .array(z.string())
      .nullish()
      .default([])
      .transform((val) => JSON.stringify(val)),
    // location: z.string().optional(),
    equipment_needed: z.array(z.string()).nullish(),
    // hourly_rate: z.coerce.number().nullish(),
    is_recurring: z.coerce.boolean().nullish(),
    recurrence_pattern: z.string().nullish(),
    assigned_to: z.string().nullish(),
    notes: z.string().nullish(),
    start_time: z.coerce.date().nullish(),
    end_time: z.coerce.date().nullish(),
    scheduled_date: z.coerce.date().optional().default(new Date()),
  });

  const data = dataSchema.parse(req.body);
  // Vérifier que la tâche existe
  const existing = await Task.findByPk(id);

  if (!existing) throw new createHttpError[404]("Tâche non trouvée");

  await existing.update({
    ...data,
  });
  // existing.name = data.name;
  // existing.description = data.description;
  // existing.category = data.category;
  // existing.priority = data.priority;
  // existing.estimated_duration = data.estimated_duration;
  // existing.required_skills = JSON.stringify(data.required_skills || []);
  // existing.location = location;
  // existing.equipment_needed = JSON.stringify(data.equipment_needed || []);
  // existing.hourly_rate = data.hourly_rate;
  // existing.is_recurring = data.is_recurring;
  // existing.recurrence_pattern = data.recurrence_pattern;
  // existing.assigned_to = data.assigned_to;
  // existing.notes = data.notes;
  // await existing.save();

  res.json({
    success: true,
    message: "Tâche mise à jour avec succès",
    task: existing,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteTask = async (req, res) => {
  const { id } = req.params;
  const existing = await Task.findByPk(id);
  if (!existing) throw new createHttpError[404]("Tâche non trouvée");
  await existing.destroy();

  res.json({
    success: true,
    message: "Tâche supprimée avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const getUsersFromTask = async (req, res) => {
  //TODO use the detail task with query param ?
  const { taskId } = req.params;

  const tasks = await Task.findByPk(taskId, { include: [{ model: Employee }] });

  res.json({
    success: true,
    employees: tasks.Employees,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const addUserToTask = async (req, res) => {
  const { taskId } = req.params;
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      message: "ID employé requis",
    });
  }

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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeUserFromTask = async (req, res) => {
  const { taskId, employeeId } = req.params;

  const task = await Task.findByPk(taskId);
  await task.removeEmployee(employeeId);

  res.json({
    success: true,
    message: "Employé retiré avec succès",
  });
};
