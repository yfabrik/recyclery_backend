import express from "express";

import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = express.Router();
// Obtenir tous les jours de travail
router.get('/', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const workdays = await database.query(`
      SELECT ew.*, u.username as employee_name, u.email as employee_email
      FROM employee_workdays ew
      LEFT JOIN users u ON ew.employee_id = u.id
      ORDER BY u.username, ew.day_of_week, ew.time_slot
    `);
    
    res.json({ 
      success: true,
      workdays 
    });
  } catch (error) {
    console.error('Erreur récupération jours de travail:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des jours de travail' 
    });
  }
});

// Obtenir les jours de travail d'un employé
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    const { employeeId } = req.params;
    
    const workdays = await database.query(`
      SELECT * FROM employee_workdays 
      WHERE employee_id = ?
      ORDER BY 
        CASE day_of_week 
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END,
        CASE time_slot
          WHEN 'morning' THEN 1
          WHEN 'afternoon' THEN 2
        END
    `, [employeeId]);
    
    res.json({ 
      success: true,
      workdays 
    });
  } catch (error) {
    console.error('Erreur récupération jours de travail employé:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des jours de travail' 
    });
  }
});

// Créer ou mettre à jour les jours de travail d'un employé
router.post('/employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { employeeId } = req.params;
    const { workdays } = req.body; // Array of workday objects
    
    if (!Array.isArray(workdays)) {
      return res.status(400).json({
        success: false,
        error: 'workdays doit être un tableau'
      });
    }
    
    // Vérifier que l'employé existe
    const employee = await database.query('SELECT id FROM users WHERE id = ?', [employeeId]);
    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employé non trouvé'
      });
    }
    
    // Supprimer les anciens jours de travail de cet employé
    await database.run('DELETE FROM employee_workdays WHERE employee_id = ?', [employeeId]);
    
    // Insérer les nouveaux jours de travail
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validTimeSlots = ['morning', 'afternoon'];
    
    for (const workday of workdays) {
      const { day_of_week, time_slot, is_working = true, start_time, end_time, notes } = workday;
      
      if (!validDays.includes(day_of_week) || !validTimeSlots.includes(time_slot)) {
        continue; // Ignorer les entrées invalides
      }
      
      await database.run(`
        INSERT INTO employee_workdays (
          employee_id, day_of_week, time_slot, is_working, 
          start_time, end_time, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [employeeId, day_of_week, time_slot, is_working ? 1 : 0, start_time || null, end_time || null, notes || null]);
    }
    
    res.json({
      success: true,
      message: 'Jours de travail mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour jours de travail:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des jours de travail'
    });
  }
});

// Créer un jour de travail individuel
router.post('/', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { employee_id, day_of_week, time_slot, is_working = true, start_time, end_time, notes } = req.body;
    
    if (!employee_id || !day_of_week || !time_slot) {
      return res.status(400).json({
        success: false,
        error: 'employee_id, day_of_week et time_slot sont requis'
      });
    }
    
    // Vérifier que l'employé existe
    const employee = await database.query('SELECT id FROM users WHERE id = ?', [employee_id]);
    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employé non trouvé'
      });
    }
    
    const result = await database.run(`
      INSERT INTO employee_workdays (
        employee_id, day_of_week, time_slot, is_working, 
        start_time, end_time, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [employee_id, day_of_week, time_slot, is_working ? 1 : 0, start_time || null, end_time || null, notes || null]);
    
    res.status(201).json({
      success: true,
      message: 'Jour de travail créé avec succès',
      workday_id: result.lastID
    });
  } catch (error) {
    console.error('Erreur création jour de travail:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        success: false,
        error: 'Ce jour de travail existe déjà'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création du jour de travail'
      });
    }
  }
});

// Mettre à jour un jour de travail
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { id } = req.params;
    const { is_working, start_time, end_time, notes } = req.body;
    
    const result = await database.run(`
      UPDATE employee_workdays 
      SET is_working = ?, start_time = ?, end_time = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [is_working ? 1 : 0, start_time || null, end_time || null, notes || null, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jour de travail non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Jour de travail mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour jour de travail:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du jour de travail'
    });
  }
});

// Supprimer un jour de travail
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { id } = req.params;
    
    const result = await database.run('DELETE FROM employee_workdays WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jour de travail non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Jour de travail supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression jour de travail:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du jour de travail'
    });
  }
});

// Supprimer tous les jours de travail d'un employé
router.delete('/employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    await database.connect();
    
    const { employeeId } = req.params;
    
    const result = await database.run('DELETE FROM employee_workdays WHERE employee_id = ?', [employeeId]);
    
    res.json({
      success: true,
      message: `${result.changes} jour(s) de travail supprimé(s) avec succès`
    });
  } catch (error) {
    console.error('Erreur suppression jours de travail employé:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression des jours de travail'
    });
  }
});

