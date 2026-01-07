import { Op } from "sequelize";
import db from "../../models/index.js";

const { Task, User, TaskSchedule } = db;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listTasks = async (req, res) => {
  const { category, priority, search } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (category && category !== "all") where.category = category;

  if (priority && priority !== "all") where.priority = priority;

  if (search)
    where[Op.or] = [
      { name: { [Op.like]: search } },
      { description: { [Op.like]: search } },
    ];

  const tasks = await Task.findAll({
    include: [
      {
        model: User,
      },
    ],
    where,
    order: [["createdAt", "DESC"]],
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
    tasks: tasks,
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

  if (!tasks) {
    return res.status(404).json({
      success: false,
      message: "Tâche non trouvée",
    });
  }

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
  const {
    name,
    description,
    category,
    priority,
    estimated_duration,
    required_skills,
    location,
    equipment_needed,
    hourly_rate,
    is_recurring,
    recurrence_pattern,
    assigned_to,
    notes,
    start_time,
    end_time,
    scheduled_date,
  } = req.body;

  // Validation des champs requis
  if (!name || !category || !priority) {
    return res.status(400).json({
      success: false,
      message: "Nom, catégorie et priorité sont obligatoires",
    });
  }
  let schedule = null;
  if (recurrence_pattern && recurrence_pattern != "none") {
    schedule = await TaskSchedule.create({
      name,
      description,
      category,
      priority,

      required_skills: JSON.stringify(required_skills || []),
      location,
      equipment_needed: JSON.stringify(equipment_needed || []),
      hourly_rate,
      recurrence_pattern,
      is_recurring,
      notes,
      start_time,
      end_time,
      scheduled_date: scheduled_date || new Date(),
    });
  }

  const task = await Task.create({
    name,
    description,
    category,
    priority,
    estimated_duration,

    required_skills: JSON.stringify(required_skills || []),
    location,
    equipment_needed: JSON.stringify(equipment_needed || []),
    hourly_rate,

    is_recurring,
    recurrence_pattern,
    assigned_to,
    notes,
    start_time,
    end_time,
    scheduled_date: scheduled_date || new Date(),
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
  const { id } = req.params;
  const {
    name,
    description,
    category,
    priority,
    estimated_duration,
    required_skills,
    location,
    equipment_needed,
    hourly_rate,
    is_recurring,
    recurrence_pattern,
    assigned_to,
    notes,
  } = req.body;

  // Vérifier que la tâche existe
  const existing = await Task.findByPk(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Tâche non trouvée",
    });
  }
  existing.name = name;
  existing.description = description;
  existing.category = category;
  existing.priority = priority;
  existing.estimated_duration = estimated_duration;
  existing.required_skills = JSON.stringify(required_skills || []);
  existing.location = location;
  existing.equipment_needed = JSON.stringify(equipment_needed || []);
  existing.hourly_rate = hourly_rate;
  existing.is_recurring = is_recurring;
  existing.recurrence_pattern = recurrence_pattern;
  existing.assigned_to = assigned_to;
  existing.notes = notes;
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

  // Vérifier que la tâche existe

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Tâche non trouvée",
    });
  }
  await Task.destroy({ where: { id } });

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

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Tâche non trouvée",
    });
  }

  // Vérifier que l'employé existe
  const employee = await User.findByPk(employee_id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employé non trouvé",
    });
  }

  //FIXME
  // if (task.hasUser(employee))
  //     return res.status(400).json({
  //         success: false,
  //         message: "Cet employé est déjà assigné à cette tâche",
  //     });

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
