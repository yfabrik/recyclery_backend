import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";

const { User } = db;

export const router = Router();
// Récupérer toutes les tâches
router.get('/', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { category, priority, search } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (priority && priority !== 'all') {
      query += ' AND priority = ?';
      params.push(priority);
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const tasks = await database.query(query, params);
    
    // Parser les champs JSON
    const parsedTasks = tasks.map(task => ({
      ...task,
      required_skills: task.required_skills ? JSON.parse(task.required_skills) : [],
      equipment_needed: task.equipment_needed ? JSON.parse(task.equipment_needed) : []
    }));
    
    res.json({
      success: true,
      tasks: parsedTasks
    });
    
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches',
      error: error.message
    });
  }
});

// Récupérer une tâche par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { id } = req.params;
    const tasks = await database.query('SELECT * FROM tasks WHERE id = ?', [id]);
    
    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }
    
    // Parser les champs JSON
    const task = {
      ...tasks[0],
      required_skills: tasks[0].required_skills ? JSON.parse(tasks[0].required_skills) : [],
      equipment_needed: tasks[0].equipment_needed ? JSON.parse(tasks[0].equipment_needed) : []
    };
    
    res.json({
      success: true,
      task: task
    });
    
  } catch (error) {
    console.error('Erreur récupération tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la tâche',
      error: error.message
    });
  }
});

// Créer une nouvelle tâche
router.post('/', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
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
      notes
    } = req.body;
    
    // Validation des champs requis
    if (!name || !category || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Nom, catégorie et priorité sont obligatoires'
      });
    }
    
    const query = `
      INSERT INTO tasks (
        name, description, category, priority, estimated_duration,
        required_skills, location, equipment_needed, hourly_rate,
        is_recurring, recurrence_pattern, assigned_to, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const params = [
      name,
      description || '',
      category,
      priority,
      estimated_duration || 60,
      JSON.stringify(required_skills || []),
      location || '',
      JSON.stringify(equipment_needed || []),
      hourly_rate || null,
      is_recurring ? 1 : 0,
      recurrence_pattern || 'none',
      assigned_to || null,
      notes || ''
    ];
    
    const result = await database.run(query, params);
    
    res.json({
      success: true,
      message: 'Tâche créée avec succès',
      task: {
        id: result.lastID,
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
        notes
      }
    });
    
  } catch (error) {
    console.error('Erreur création tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la tâche',
      error: error.message
    });
  }
});

// Mettre à jour une tâche
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
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
      notes
    } = req.body;
    
    // Vérifier que la tâche existe
    const existingTasks = await database.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existingTasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }
    
    const query = `
      UPDATE tasks SET
        name = ?, description = ?, category = ?, priority = ?,
        estimated_duration = ?, required_skills = ?, location = ?,
        equipment_needed = ?, hourly_rate = ?, is_recurring = ?,
        recurrence_pattern = ?, assigned_to = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const params = [
      name,
      description || '',
      category,
      priority,
      estimated_duration || 60,
      JSON.stringify(required_skills || []),
      location || '',
      JSON.stringify(equipment_needed || []),
      hourly_rate || null,
      is_recurring ? 1 : 0,
      recurrence_pattern || 'none',
      assigned_to || null,
      notes || '',
      id
    ];
    
    await database.query(query, params);
    
    res.json({
      success: true,
      message: 'Tâche mise à jour avec succès'
    });
    
  } catch (error) {
    console.error('Erreur mise à jour tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la tâche',
      error: error.message
    });
  }
});

// Supprimer une tâche
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { id } = req.params;
    
    // Vérifier que la tâche existe
    const existingTasks = await database.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existingTasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }
    
    await database.query('DELETE FROM tasks WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Tâche supprimée avec succès'
    });
    
  } catch (error) {
    console.error('Erreur suppression tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la tâche',
      error: error.message
    });
  }
});

// Récupérer les employés assignés à une tâche
router.get('/:taskId/employees', authenticateToken, async (req, res) => {
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
      employees: employees
    });
    
  } catch (error) {
    console.error('Erreur récupération employés tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des employés',
      error: error.message
    });
  }
});

// Assigner un employé à une tâche
router.post('/:taskId/employees', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { taskId } = req.params;
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'ID employé requis'
      });
    }
    
    // Vérifier que la tâche existe
    const taskQuery = 'SELECT id FROM tasks WHERE id = ?';
    const task = await database.query(taskQuery, [taskId]);
    
    if (task.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }
    
    // Vérifier que l'employé existe
    const employeeQuery = 'SELECT id FROM users WHERE id = ?';
    const employee = await database.query(employeeQuery, [employee_id]);
    
    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }
    
    // Vérifier si l'assignation existe déjà
    const existingQuery = 'SELECT id FROM task_employees WHERE task_id = ? AND employee_id = ?';
    const existing = await database.query(existingQuery, [taskId, employee_id]);
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cet employé est déjà assigné à cette tâche'
      });
    }
    
    // Créer l'assignation
    const insertQuery = 'INSERT INTO task_employees (task_id, employee_id, assigned_at) VALUES (?, ?, CURRENT_TIMESTAMP)';
    await database.query(insertQuery, [taskId, employee_id]);
    
    res.json({
      success: true,
      message: 'Employé assigné avec succès'
    });
    
  } catch (error) {
    console.error('Erreur assignation employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation',
      error: error.message
    });
  }
});

// Retirer un employé d'une tâche
router.delete('/:taskId/employees/:employeeId', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { taskId, employeeId } = req.params;
    
    const query = 'DELETE FROM task_employees WHERE task_id = ? AND employee_id = ?';
    const result = await database.query(query, [taskId, employeeId]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignation non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Employé retiré avec succès'
    });
    
  } catch (error) {
    console.error('Erreur retrait employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait',
      error: error.message
    });
  }
});
