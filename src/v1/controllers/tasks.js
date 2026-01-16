import { Op } from "sequelize";
import db from "../../models/index.js";
import * as z from "zod";
import collection from "../../models/poubelle/collection.js";
import createHttpError from "http-errors";

const { Task, User, TaskSchedule } = db;

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
      .enum(["point", "vente", "collection"])
      .nullable()
      .optional()
      .default(
        req.originalUrl == "/api/collection-point-presence"
          ? "point"
          : req.originalUrl == "/api/store-hours"
          ? "vente"
          : req.originalUrl == "/api/collections"
          ? "collection"
          : null
      ),
    priority: z.string().optional(),
    search: z.string().optional(),
  });
  // const category = req.originalUrl == '/api/collection-point-presence' ? "point" : req.originalUrl == '/api/store-hours' ? "vente" : req.originalUrl == '/api/collections' ? "collection" : null
  const data = includeSchema.parse({ ...req.query });

  /**
   * @type {import("sequelize").WhereOptions<import("../../models/types/taskModel.js").TaskAttributes>}
   */
  const where = {};
  if (data.category && data.category !== "all") where.category = data.category;

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
      model: User,
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

  if (!tasks)throw new createHttpError[404]("Tâche non trouvée")

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
    name: z.string("Nom requis"),
    description: z.string().optional(),
    category: z.string("categorie requis"),
    priority: z.string("priorité requis"),
    estimated_duration: z.coerce.number().optional(),
    required_skills: z
      .array(z.string())
      .optional()
      .default([])
      .transform((val) => JSON.stringify(val)),
    location: z.string().optional(),
    equipment_needed: z.array(z.string()).optional(),
    hourly_rate: z.coerce.number().optional(),
    is_recurring: z.coerce.boolean().optional(),
    recurrence_pattern: z.string().optional(),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
    start_time: z.coerce.date().optional(),
    end_time: z.coerce.date().optional(),
    scheduled_date: z.coerce.date().optional().default(new Date()),
  });

  const data = dataSchema.parse(req.body);
  let schedule = null;
  if (data.recurrence_pattern && data.recurrence_pattern != "none") {
    schedule = await TaskSchedule.create({
      ...data,
    });
    console.log(schedule);
  }
  const { is_recurring, recurrence_pattern, ...rest } = data;
  const task = await Task.create({
    ...rest,
    status: "a",
    schedule_id: schedule?.id || null,
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
    name: z.string("Nom requis"),
    description: z.string().optional(),
    category: z.string("categorie requis"),
    priority: z.string("priorité requis"),
    estimated_duration: z.coerce.number().optional(),
    required_skills: z
      .array(z.string())
      .optional()
      .default([])
      .transform((val) => JSON.stringify(val)),
    location: z.string().optional(),
    equipment_needed: z.array(z.string()).optional(),
    hourly_rate: z.coerce.number().optional(),
    is_recurring: z.coerce.boolean().optional(),
    recurrence_pattern: z.string().optional(),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
    start_time: z.coerce.date().optional(),
    end_time: z.coerce.date().optional(),
    scheduled_date: z.coerce.date().optional().default(new Date()),
  });

  const data = dataSchema.parse(req.body);
  // Vérifier que la tâche existe
  const existing = await Task.findByPk(id);

  if (!existing) throw new createHttpError[404]("Tâche non trouvée")

  existing.name = data.name;
  existing.description = data.description;
  existing.category = data.category;
  existing.priority = data.priority;
  existing.estimated_duration = data.estimated_duration;
  existing.required_skills = JSON.stringify(data.required_skills || []);
  existing.location = location;
  existing.equipment_needed = JSON.stringify(data.equipment_needed || []);
  existing.hourly_rate = data.hourly_rate;
  existing.is_recurring = data.is_recurring;
  existing.recurrence_pattern = data.recurrence_pattern;
  existing.assigned_to = data.assigned_to;
  existing.notes = data.notes;
  await existing.save();

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
  if (!existing) throw new createHttpError[404]("Tâche non trouvée") 
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

  const tasks = await Task.findByPk(taskId, { include: [{ model: User }] });

  res.json({
    success: true,
    employees: tasks.Users,
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

  if (!task)throw new createHttpError[404]("Tâche non trouvée")

  // Vérifier que l'employé existe
  const employee = await User.findByPk(employee_id);

  if (!employee)throw new createHttpError[404]("Employé non trouvé") 

  //FIXME
  // if (task.hasUser(employee))
  //   return res.status(400).json({
  //     success: false,
  //     message: "Cet employé est déjà assigné à cette tâche",
  //   });

  await task.addUser(employee);

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
  await task.removeUser(employeeId);

  res.json({
    success: true,
    message: "Employé retiré avec succès",
  });
};
