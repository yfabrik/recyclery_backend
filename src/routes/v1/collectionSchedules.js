
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();

// Générer un numéro de bordereau unique
const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `COL-${year}${month}${day}-${timestamp}`;
};

// Obtenir tous les plannings de collecte
router.get('/', authenticateToken, (req, res) => {
  const { date_from, date_to, status, employee_id } = req.query;
  
  let query = `
    SELECT 
      cs.*,
      cp.name as collection_point_name,
      cp.address as collection_point_address,
      cp.city as collection_point_city,
      cp.contact_person,
      cp.contact_phone,
      u.username as employee_name
    FROM collection_schedules cs
    LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
    LEFT JOIN users u ON cs.employee_id = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (date_from) {
    query += ' AND cs.scheduled_date >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    query += ' AND cs.scheduled_date <= ?';
    params.push(date_to);
  }
  
  if (status) {
    query += ' AND cs.status = ?';
    params.push(status);
  }
  
  if (employee_id) {
    query += ' AND cs.employee_id = ?';
    params.push(employee_id);
  }
  
  query += ' ORDER BY cs.scheduled_date, cs.scheduled_time';

  db.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Erreur lors de la récupération des plannings:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des plannings'
      });
    }

    res.json({
      success: true,
      schedules: schedules
    });
  });
});

// Obtenir les plannings pour le calendrier
router.get('/calendar', authenticateToken, (req, res) => {
  const { month, year } = req.query;
  
  let query = `
    SELECT 
      cs.id,
      cs.scheduled_date,
      cs.scheduled_time,
      cs.status,
      cs.estimated_duration,
      cp.name as collection_point_name,
      u.username as employee_name
    FROM collection_schedules cs
    LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
    LEFT JOIN users u ON cs.employee_id = u.id
  `;
  
  const params = [];
  
  if (month && year) {
    query += ' WHERE strftime("%Y-%m", cs.scheduled_date) = ?';
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  
  query += ' ORDER BY cs.scheduled_date, cs.scheduled_time';

  db.all(query, params, (err, events) => {
    if (err) {
      console.error('Erreur lors de la récupération du calendrier:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du calendrier'
      });
    }

    // Transformer les données pour le calendrier
    const calendarEvents = events.map(event => ({
      id: event.id,
      title: `${event.collection_point_name} - ${event.employee_name || 'Non assigné'}`,
      start: `${event.scheduled_date}T${event.scheduled_time}`,
      end: event.estimated_duration ? 
        new Date(new Date(`${event.scheduled_date}T${event.scheduled_time}`).getTime() + event.estimated_duration * 60000).toISOString() :
        `${event.scheduled_date}T${event.scheduled_time}`,
      backgroundColor: event.status === 'completed' ? '#4caf50' : 
                      event.status === 'cancelled' ? '#f44336' : 
                      event.status === 'in_progress' ? '#ff9800' : '#2196f3',
      extendedProps: {
        status: event.status,
        collection_point_name: event.collection_point_name,
        employee_name: event.employee_name
      }
    }));

    res.json({
      success: true,
      events: calendarEvents
    });
  });
});

// Créer un nouveau planning de collecte
router.post('/', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const {
    collection_point_id,
    scheduled_date,
    scheduled_time,
    employee_id,
    vehicle,
    estimated_duration,
    notes
  } = req.body;

  // Validation
  if (!collection_point_id || !scheduled_date || !scheduled_time) {
    return res.status(400).json({
      success: false,
      error: 'Le point de collecte, la date et l\'heure sont requis'
    });
  }

  // Vérifier si le point de collecte existe
  db.get('SELECT * FROM collection_points WHERE id = ?', [collection_point_id], (err, point) => {
    if (err) {
      console.error('Erreur lors de la vérification du point:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification du point de collecte'
      });
    }

    if (!point) {
      return res.status(400).json({
        success: false,
        error: 'Point de collecte non trouvé'
      });
    }

    // Vérifier la disponibilité de l'employé
    if (employee_id) {
      db.get(`
        SELECT id FROM collection_schedules 
        WHERE employee_id = ? AND scheduled_date = ? AND scheduled_time = ? AND status != 'cancelled'
      `, [employee_id, scheduled_date, scheduled_time], (err, conflict) => {
        if (err) {
          console.error('Erreur lors de la vérification de disponibilité:', err);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la vérification de disponibilité'
          });
        }

        if (conflict) {
          return res.status(400).json({
            success: false,
            error: 'L\'employé n\'est pas disponible à cette heure'
          });
        }

        createSchedule();
      });
    } else {
      createSchedule();
    }

    function createSchedule() {
      const receiptNumber = generateReceiptNumber();

      const stmt = db.prepare(`
        INSERT INTO collection_schedules (
          collection_point_id, scheduled_date, scheduled_time, employee_id,
          vehicle, estimated_duration, notes, receipt_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        collection_point_id, scheduled_date, scheduled_time, employee_id,
        vehicle, estimated_duration || 60, notes, receiptNumber
      ], function(err) {
        if (err) {
          console.error('Erreur lors de la création du planning:', err);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du planning'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Planning de collecte créé avec succès',
          schedule: {
            id: this.lastID,
            collection_point_id,
            scheduled_date,
            scheduled_time,
            employee_id,
            vehicle,
            estimated_duration: estimated_duration || 60,
            notes,
            receipt_number: receiptNumber,
            status: 'planned'
          }
        });
      });

      stmt.finalize();
    }
  });
});

// Mettre à jour un planning de collecte
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;
  const {
    collection_point_id,
    scheduled_date,
    scheduled_time,
    employee_id,
    vehicle,
    estimated_duration,
    notes,
    status
  } = req.body;

  // Validation
  if (!collection_point_id || !scheduled_date || !scheduled_time) {
    return res.status(400).json({
      success: false,
      error: 'Le point de collecte, la date et l\'heure sont requis'
    });
  }

  // Vérifier si le planning existe
  db.get('SELECT * FROM collection_schedules WHERE id = ?', [id], (err, schedule) => {
    if (err) {
      console.error('Erreur lors de la récupération du planning:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du planning'
      });
    }

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Planning non trouvé'
      });
    }

    // Mettre à jour le planning
    const stmt = db.prepare(`
      UPDATE collection_schedules 
      SET collection_point_id = ?, scheduled_date = ?, scheduled_time = ?,
          employee_id = ?, vehicle = ?, estimated_duration = ?, notes = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run([
      collection_point_id, scheduled_date, scheduled_time, employee_id,
      vehicle, estimated_duration || 60, notes, status || 'planned', id
    ], function(err) {
      if (err) {
        console.error('Erreur lors de la mise à jour:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la mise à jour du planning'
        });
      }

      res.json({
        success: true,
        message: 'Planning mis à jour avec succès'
      });
    });

    stmt.finalize();
  });
});

// Supprimer un planning de collecte
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  // Vérifier si le planning existe
  db.get('SELECT * FROM collection_schedules WHERE id = ?', [id], (err, schedule) => {
    if (err) {
      console.error('Erreur lors de la récupération du planning:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du planning'
      });
    }

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Planning non trouvé'
      });
    }

    // Supprimer le planning
    const stmt = db.prepare('DELETE FROM collection_schedules WHERE id = ?');
    stmt.run([id], function(err) {
      if (err) {
        console.error('Erreur lors de la suppression:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la suppression du planning'
        });
      }

      res.json({
        success: true,
        message: 'Planning supprimé avec succès'
      });
    });

    stmt.finalize();
  });
});

// Générer un bordereau de collecte
router.post('/:id/receipt', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { items_collected, total_weight, notes, signature_data } = req.body;

  // Récupérer les informations du planning
  db.get(`
    SELECT 
      cs.*,
      cp.name as collection_point_name,
      cp.address as collection_point_address,
      cp.city as collection_point_city,
      u.username as collector_name
    FROM collection_schedules cs
    LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
    LEFT JOIN users u ON cs.employee_id = u.id
    WHERE cs.id = ?
  `, [id], (err, schedule) => {
    if (err) {
      console.error('Erreur lors de la récupération du planning:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du planning'
      });
    }

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Planning non trouvé'
      });
    }

    // Créer le bordereau
    const stmt = db.prepare(`
      INSERT INTO collection_receipts (
        schedule_id, receipt_number, collection_date, collector_name,
        collection_point_name, collection_point_address, items_collected,
        total_weight, notes, signature_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const collectionAddress = `${schedule.collection_point_address}, ${schedule.collection_point_city}`;

    stmt.run([
      id, schedule.receipt_number, new Date().toISOString(),
      schedule.collector_name || 'Non assigné', schedule.collection_point_name,
      collectionAddress, JSON.stringify(items_collected || []),
      total_weight, notes, signature_data
    ], function(err) {
      if (err) {
        console.error('Erreur lors de la création du bordereau:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création du bordereau'
        });
      }

      // Mettre à jour le statut du planning
      db.run('UPDATE collection_schedules SET status = ? WHERE id = ?', ['completed', id]);

      res.status(201).json({
        success: true,
        message: 'Bordereau créé avec succès',
        receipt: {
          id: this.lastID,
          receipt_number: schedule.receipt_number,
          collection_date: new Date().toISOString(),
          collector_name: schedule.collector_name || 'Non assigné',
          collection_point_name: schedule.collection_point_name,
          collection_point_address: collectionAddress,
          items_collected,
          total_weight,
          notes
        }
      });
    });

    stmt.finalize();
  });
});

// Obtenir un bordereau de collecte
router.get('/:id/receipt', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM collection_receipts WHERE schedule_id = ?', [id], (err, receipt) => {
    if (err) {
      console.error('Erreur lors de la récupération du bordereau:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du bordereau'
      });
    }

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Bordereau non trouvé'
      });
    }

    // Parser les items collectés
    let itemsCollected = [];
    try {
      itemsCollected = JSON.parse(receipt.items_collected || '[]');
    } catch (e) {
      console.error('Erreur lors du parsing des items:', e);
    }

    res.json({
      success: true,
      receipt: {
        ...receipt,
        items_collected: itemsCollected
      }
    });
  });
});

// Récupérer les employés disponibles pour une collecte spécifique (en tenant compte des conflits d'horaires et de la présence)
router.get('/:scheduleId/available-employees', authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Récupérer les détails de la collecte
    const scheduleQuery = `
      SELECT cs.*, cp.name as collection_point_name, cp.recyclery_id
      FROM collection_schedules cs
      LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
      WHERE cs.id = ?
    `;
    
    db.get(scheduleQuery, [scheduleId], (err, schedule) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération de la collecte',
          error: err.message
        });
      }
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Collecte non trouvée'
        });
      }
      
      // Déterminer le jour de la semaine de la collecte
      const taskDate = new Date(schedule.scheduled_date);
      const dayOfWeek = taskDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Récupérer les employés du magasin ET présents ce jour-là
      let allEmployeesQuery;
      if (schedule.recyclery_id) {
        allEmployeesQuery = `
          SELECT DISTINCT u.id, u.username, u.email, u.role 
          FROM users u 
          INNER JOIN employee_workdays ew ON u.id = ew.employee_id
          WHERE u.role = "employee" 
          AND u.recyclery_id = ?
          AND ew.day_of_week = ?
          AND ew.is_working = 1
        `;
      } else {
        // Pour les collectes sans magasin spécifique
        allEmployeesQuery = `
          SELECT DISTINCT u.id, u.username, u.email, u.role 
          FROM users u 
          INNER JOIN employee_workdays ew ON u.id = ew.employee_id
          WHERE u.role = "employee"
          AND ew.day_of_week = ?
          AND ew.is_working = 1
        `;
      }
      
      console.log(`🚛 Filtrage des employés pour la collecte ID: ${scheduleId}`);
      console.log(`🏪 Magasin: ${schedule.recyclery_id}`);
      console.log(`📅 Date: ${schedule.scheduled_date} (${dayOfWeek})`);
      
      db.all(allEmployeesQuery, schedule.recyclery_id ? [schedule.recyclery_id, dayOfWeek] : [dayOfWeek], (err, allEmployees) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des employés',
            error: err.message
          });
        }
        
        console.log(`👥 Nombre d'employés présents trouvés: ${allEmployees.length}`);
        console.log(`👤 Employés présents:`, allEmployees.map(emp => emp.username));
        
        // Pour chaque employé, vérifier s'il est disponible
        const availableEmployees = [];
        let processedCount = 0;
        
        if (allEmployees.length === 0) {
          return res.json({
            success: true,
            employees: [],
            schedule_info: {
              id: schedule.id,
              scheduled_date: schedule.scheduled_date,
              scheduled_time: schedule.scheduled_time,
              collection_point_name: schedule.collection_point_name
            }
          });
        }
        
        allEmployees.forEach((employee, index) => {
          // Vérifier les conflits d'horaires pour cet employé
          const conflictQuery = `
            SELECT cs.id, cs.scheduled_date, cs.scheduled_time
            FROM collection_schedules cs
            WHERE cs.employee_id = ? 
              AND cs.scheduled_date = ?
              AND cs.id != ?
              AND (
                TIME(cs.scheduled_time) BETWEEN TIME(?) AND TIME(DATETIME(?, '+1 hour')) OR
                TIME(DATETIME(?, '+1 hour')) BETWEEN TIME(cs.scheduled_time) AND TIME(DATETIME(cs.scheduled_time, '+1 hour'))
              )
            UNION ALL
            SELECT ts.id, ts.scheduled_date, ts.start_time
            FROM task_schedules ts
            INNER JOIN task_schedule_employees tse ON ts.id = tse.schedule_id
            WHERE tse.employee_id = ? 
              AND ts.scheduled_date = ?
              AND (
                TIME(ts.start_time) BETWEEN TIME(?) AND TIME(DATETIME(?, '+1 hour')) OR
                TIME(DATETIME(?, '+1 hour')) BETWEEN TIME(ts.start_time) AND TIME(ts.end_time)
              )
          `;
          
          const endTime = new Date(`${schedule.scheduled_date} ${schedule.scheduled_time}`);
          endTime.setHours(endTime.getHours() + 1); // Collecte dure 1h par défaut
          const endTimeStr = endTime.toTimeString().slice(0, 5);
          
          db.all(conflictQuery, [
            employee.id, schedule.scheduled_date, scheduleId, schedule.scheduled_time, schedule.scheduled_time, schedule.scheduled_time,
            employee.id, schedule.scheduled_date, schedule.scheduled_time, schedule.scheduled_time, schedule.scheduled_time
          ], (err, conflicts) => {
            if (err) {
              console.error('Erreur vérification conflits:', err);
              conflicts = [];
            }
            
            // Vérifier si l'employé est déjà assigné à cette collecte
            const alreadyAssigned = schedule.employee_id === employee.id;
            
            availableEmployees.push({
              ...employee,
              is_available: conflicts.length === 0 && !alreadyAssigned,
              has_conflicts: conflicts.length > 0,
              conflicts: conflicts,
              already_assigned: alreadyAssigned
            });
            
            processedCount++;
            if (processedCount === allEmployees.length) {
              res.json({
                success: true,
                employees: availableEmployees,
                schedule_info: {
                  id: schedule.id,
                  scheduled_date: schedule.scheduled_date,
                  scheduled_time: schedule.scheduled_time,
                  collection_point_name: schedule.collection_point_name
                }
              });
            }
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur récupération employés disponibles collecte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des employés disponibles',
      error: error.message
    });
  }
});

// Assigner un employé à une collecte spécifique
router.post('/:scheduleId/employees', authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'ID employé requis'
      });
    }
    
    // Vérifier que la collecte existe et récupérer ses détails
    const scheduleQuery = `
      SELECT cs.*, cp.recyclery_id
      FROM collection_schedules cs
      LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
      WHERE cs.id = ?
    `;
    
    db.get(scheduleQuery, [scheduleId], (err, schedule) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération de la collecte',
          error: err.message
        });
      }
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Collecte non trouvée'
        });
      }
      
      // Déterminer le jour de la semaine de la collecte
      const taskDate = new Date(schedule.scheduled_date);
      const dayOfWeek = taskDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Vérifier que l'employé existe, appartient au bon magasin ET est présent ce jour-là
      let employeeQuery;
      if (schedule.recyclery_id) {
        employeeQuery = `
          SELECT u.id, u.username, u.recyclery_id 
          FROM users u 
          INNER JOIN employee_workdays ew ON u.id = ew.employee_id
          WHERE u.id = ? 
          AND u.role = "employee"
          AND u.recyclery_id = ?
          AND ew.day_of_week = ?
          AND ew.is_working = 1
        `;
      } else {
        employeeQuery = `
          SELECT u.id, u.username, u.recyclery_id 
          FROM users u 
          INNER JOIN employee_workdays ew ON u.id = ew.employee_id
          WHERE u.id = ? 
          AND u.role = "employee"
          AND ew.day_of_week = ?
          AND ew.is_working = 1
        `;
      }
      
      db.get(employeeQuery, schedule.recyclery_id ? [employee_id, schedule.recyclery_id, dayOfWeek] : [employee_id, dayOfWeek], (err, employee) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification de l\'employé',
            error: err.message
          });
        }
        
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: `Employé non trouvé, n'appartient pas à ce magasin ou ne travaille pas le ${dayOfWeek}`
          });
        }
        
        console.log(`✅ Employé ${employee.username} vérifié pour la collecte ${scheduleId}`);
        
        // Vérifier si l'employé est déjà assigné à cette collecte
        if (schedule.employee_id === employee_id) {
          return res.status(400).json({
            success: false,
            message: 'Cet employé est déjà assigné à cette collecte'
          });
        }
        
        // Vérifier les conflits d'horaires
        const conflictQuery = `
          SELECT cs.id, cs.scheduled_date, cs.scheduled_time, cp.name as collection_point_name
          FROM collection_schedules cs
          LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
          WHERE cs.employee_id = ? 
            AND cs.scheduled_date = ?
            AND cs.id != ?
            AND (
              TIME(cs.scheduled_time) BETWEEN TIME(?) AND TIME(DATETIME(?, '+1 hour')) OR
              TIME(DATETIME(?, '+1 hour')) BETWEEN TIME(cs.scheduled_time) AND TIME(DATETIME(cs.scheduled_time, '+1 hour'))
            )
          UNION ALL
          SELECT ts.id, ts.scheduled_date, ts.start_time, 
                 CASE 
                   WHEN ts.task_id IS NULL THEN 'Ouverture magasin'
                   WHEN t.name IS NULL THEN 'Tâche sans nom'
                   ELSE t.name 
                 END as collection_point_name
          FROM task_schedules ts
          INNER JOIN task_schedule_employees tse ON ts.id = tse.schedule_id
          LEFT JOIN tasks t ON ts.task_id = t.id
          WHERE tse.employee_id = ? 
            AND ts.scheduled_date = ?
            AND (
              TIME(ts.start_time) BETWEEN TIME(?) AND TIME(DATETIME(?, '+1 hour')) OR
              TIME(DATETIME(?, '+1 hour')) BETWEEN TIME(ts.start_time) AND TIME(ts.end_time)
            )
        `;
        
        const endTime = new Date(`${schedule.scheduled_date} ${schedule.scheduled_time}`);
        endTime.setHours(endTime.getHours() + 1);
        const endTimeStr = endTime.toTimeString().slice(0, 5);
        
        db.all(conflictQuery, [
          employee_id, schedule.scheduled_date, scheduleId, schedule.scheduled_time, schedule.scheduled_time, schedule.scheduled_time,
          employee_id, schedule.scheduled_date, schedule.scheduled_time, schedule.scheduled_time, schedule.scheduled_time
        ], (err, conflicts) => {
          if (err) {
            console.error('Erreur vérification conflits:', err);
            conflicts = [];
          }
          
          if (conflicts.length > 0) {
            const conflictDetails = conflicts.map(c => 
              `${c.collection_point_name} (${c.scheduled_time || c.start_time})`
            ).join(', ');
            
            return res.status(400).json({
              success: false,
              message: `L'employé est déjà assigné à d'autres tâches à ce moment : ${conflictDetails}`,
              conflicts: conflicts
            });
          }
          
          // Assigner l'employé à la collecte
          const updateQuery = 'UPDATE collection_schedules SET employee_id = ? WHERE id = ?';
          db.run(updateQuery, [employee_id, scheduleId], function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'assignation',
                error: err.message
              });
            }
            
            res.json({
              success: true,
              message: 'Employé assigné avec succès'
            });
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur assignation employé collecte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation de l\'employé',
      error: error.message
    });
  }
});

// Retirer un employé d'une collecte spécifique
router.delete('/:scheduleId/employees/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { scheduleId, employeeId } = req.params;
    
    // Vérifier que la collecte existe et que l'employé est bien assigné
    const checkQuery = 'SELECT employee_id FROM collection_schedules WHERE id = ?';
    db.get(checkQuery, [scheduleId], (err, schedule) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification de la collecte',
          error: err.message
        });
      }
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Collecte non trouvée'
        });
      }
      
      if (schedule.employee_id != employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Cet employé n\'est pas assigné à cette collecte'
        });
      }
      
      // Retirer l'employé de la collecte
      const updateQuery = 'UPDATE collection_schedules SET employee_id = NULL WHERE id = ?';
      db.run(updateQuery, [scheduleId], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Erreur lors du retrait de l\'employé',
            error: err.message
          });
        }
        
        res.json({
          success: true,
          message: 'Employé retiré avec succès'
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur retrait employé collecte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait de l\'employé',
      error: error.message
    });
  }
});

module.exports = router;
