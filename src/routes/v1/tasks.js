import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";
import { Op } from "sequelize";

const { Task } = db;

export const router = Router();
// Récupérer toutes les tâches
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { category, priority, search } = req.query;

    if (category && category !== "all") where.category = category;

    if (priority && priority !== "all") where.priority = priority;

    if (search)
      where[Op.or] = [
        { name: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
      ];

    const tasks = await Task.findAll({ where, order: ["createdAt", "DESC"] });

    // Parser les champs JSON
    const parsedTasks = tasks.map((task) => ({
      ...task,
      required_skills: task.required_skills
        ? JSON.parse(task.required_skills)
        : [],
      equipment_needed: task.equipment_needed
        ? JSON.parse(task.equipment_needed)
        : [],
    }));

    res.json({
      success: true,
      tasks: parsedTasks,
    });
  })
);

// Récupérer une tâche par ID
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
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
      required_skills: tasks[0].required_skills
        ? JSON.parse(tasks[0].required_skills)
        : [],
      equipment_needed: tasks[0].equipment_needed
        ? JSON.parse(tasks[0].equipment_needed)
        : [],
    };

    res.json({
      success: true,
      task: task,
    });
  })
);

// Créer une nouvelle tâche
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
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

    // Validation des champs requis
    if (!name || !category || !priority) {
      return res.status(400).json({
        success: false,
        message: "Nom, catégorie et priorité sont obligatoires",
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
    });

    res.json({
      success: true,
      message: "Tâche créée avec succès",
      task,
    });
  })
);

// Mettre à jour une tâche
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
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
    existing.name ??= name;
    existing.description ??= description;
    existing.category ??= category;
    existing.priority ??= priority;
    existing.estimated_duration ??= estimated_duration;
    (existing.required_skills ??= JSON.stringify(required_skills || [])),
      (existing.location ??= location);
    (existing.equipment_needed ??= JSON.stringify(equipment_needed || [])),
      (existing.hourly_rate ??= hourly_rate);
    existing.is_recurring ??= is_recurring;
    existing.recurrence_pattern ??= recurrence_pattern;
    existing.assigned_to ??= assigned_to;
    existing.notes ??= notes;
    await existing.save();

    res.json({
      success: true,
      message: "Tâche mise à jour avec succès",
    });
  })
);

// Supprimer une tâche
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
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
  })
);

// Récupérer les employés assignés à une tâche
router.get("/:taskId/employees", authenticateToken, async (req, res) => {
  try {
    await database.connect();

    const { taskId } = req.params;

    const query = `
      SELECT u.id, u.username, u.role, u.email
      FROM users u
      INNER JOIN task_employees te ON u.id = te.employee_id
      WHERE te.task_id = ?
    `;

    const employees = await database.query(query, [taskId]);

    res.json({
      success: true,
      employees: employees,
    });
  } catch (error) {
    console.error("Erreur récupération employés tâche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des employés",
      error: error.message,
    });
  }
});

// Assigner un employé à une tâche
router.post("/:taskId/employees", authenticateToken, async (req, res) => {
  try {
    await database.connect();

    const { taskId } = req.params;
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "ID employé requis",
      });
    }

    // Vérifier que la tâche existe
    const taskQuery = "SELECT id FROM tasks WHERE id = ?";
    const task = await database.query(taskQuery, [taskId]);

    if (task.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tâche non trouvée",
      });
    }

    // Vérifier que l'employé existe
    const employeeQuery = "SELECT id FROM users WHERE id = ?";
    const employee = await database.query(employeeQuery, [employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employé non trouvé",
      });
    }

    // Vérifier si l'assignation existe déjà
    const existingQuery =
      "SELECT id FROM task_employees WHERE task_id = ? AND employee_id = ?";
    const existing = await database.query(existingQuery, [taskId, employee_id]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cet employé est déjà assigné à cette tâche",
      });
    }

    // Créer l'assignation
    const insertQuery =
      "INSERT INTO task_employees (task_id, employee_id, assigned_at) VALUES (?, ?, CURRENT_TIMESTAMP)";
    await database.query(insertQuery, [taskId, employee_id]);

    res.json({
      success: true,
      message: "Employé assigné avec succès",
    });
  } catch (error) {
    console.error("Erreur assignation employé:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'assignation",
      error: error.message,
    });
  }
});

// Retirer un employé d'une tâche
router.delete(
  "/:taskId/employees/:employeeId",
  authenticateToken,
  async (req, res) => {
    try {
      await database.connect();

      const { taskId, employeeId } = req.params;

      const query =
        "DELETE FROM task_employees WHERE task_id = ? AND employee_id = ?";
      const result = await database.query(query, [taskId, employeeId]);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "Assignation non trouvée",
        });
      }

      res.json({
        success: true,
        message: "Employé retiré avec succès",
      });
    } catch (error) {
      console.error("Erreur retrait employé:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du retrait",
        error: error.message,
      });
    }
  }
);
