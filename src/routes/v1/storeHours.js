import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op, where } from "sequelize";
import salestransaction from "../../models/salestransaction.js";
const { LabeledItem, Category, User, SalesTransaction, Store, Refund } = db;

export const router = Router();
router.use(authenticateToken);

// Récupérer tous les horaires des magasins
router.get('/', authenticateToken, async (req, res) => {

    const storeHours = await database.query(`
      SELECT sh.*, s.name as store_name
      FROM store_hours sh
      LEFT JOIN stores s ON sh.store_id = s.id
      ORDER BY s.name, sh.day_of_week
    `);
    
    res.json({
      success: true,
      storeHours
    });
    
 
});

// Récupérer les horaires d'un magasin spécifique
router.get('/store/:storeId', authenticateToken, async (req, res) => {

    
    const { storeId } = req.params;
    
    const storeHours = await database.query(`
      SELECT sh.*, s.name as store_name
      FROM store_hours sh
      LEFT JOIN stores s ON sh.store_id = s.id
      WHERE sh.store_id = ?
      ORDER BY sh.day_of_week
    `, [storeId]);
    
    res.json({
      success: true,
      storeHours
    });
    

});

// Créer de nouveaux horaires
router.post('/', authenticateToken, async (req, res) => {

    
    console.log('Requête store-hours reçue:', req.body);
    
    const {
      store_id,
      day_of_week,
      time_slot_name,
      is_open,
      open_time,
      close_time,
      is_24h,
      notes
    } = req.body;
    
    // Validation des champs requis
    if (!store_id || !day_of_week) {
      console.log('Erreur validation: store_id ou day_of_week manquant');
      return res.status(400).json({
        success: false,
        message: 'ID du magasin et jour de la semaine sont obligatoires'
      });
    }
    
    // Vérifier si des horaires existent déjà pour ce magasin, ce jour et ce créneau
    const existingHours = await database.query(
      'SELECT id FROM store_hours WHERE store_id = ? AND day_of_week = ? AND time_slot_name = ?',
      [store_id, day_of_week, time_slot_name || 'Ouverture']
    );
    
    if (existingHours.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Des horaires existent déjà pour ce magasin, ce jour et ce créneau'
      });
    }
    
    const query = `
      INSERT INTO store_hours (
        store_id, day_of_week, time_slot_name, is_open, open_time, close_time, 
        is_24h, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const params = [
      store_id,
      day_of_week,
      time_slot_name || 'Ouverture',
      is_open === true || is_open === 'true' ? 1 : 0,
      is_open && !is_24h ? open_time : null,
      is_open && !is_24h ? close_time : null,
      is_24h === true || is_24h === 'true' ? 1 : 0,
      notes || ''
    ];
    
    console.log('Paramètres SQL:', params);
    
    const result = await database.run(query, params);
    
    res.json({
      success: true,
      message: 'Horaires créés avec succès',
      id: result.lastID
    });
    
 
});

// Mettre à jour des horaires
router.put('/:id', authenticateToken, async (req, res) => {
 
    const { id } = req.params;
    const {
      store_id,
      day_of_week,
      time_slot_name,
      is_open,
      open_time,
      close_time,
      is_24h,
      notes
    } = req.body;
    
    // Vérifier que les horaires existent
    const existingHours = await database.query('SELECT * FROM store_hours WHERE id = ?', [id]);
    if (existingHours.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Horaires non trouvés'
      });
    }
    
    // Vérifier s'il n'y a pas de conflit avec d'autres horaires du même magasin, jour et créneau
    const conflictHours = await database.query(
      'SELECT id FROM store_hours WHERE store_id = ? AND day_of_week = ? AND time_slot_name = ? AND id != ?',
      [store_id, day_of_week, time_slot_name || 'Ouverture', id]
    );
    
    if (conflictHours.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Des horaires existent déjà pour ce magasin, ce jour et ce créneau'
      });
    }
    
    const query = `
      UPDATE store_hours SET
        store_id = ?, day_of_week = ?, time_slot_name = ?, is_open = ?, 
        open_time = ?, close_time = ?, is_24h = ?, 
        notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const params = [
      store_id,
      day_of_week,
      time_slot_name || 'Ouverture',
      is_open ? 1 : 0,
      is_open && !is_24h ? open_time : null,
      is_open && !is_24h ? close_time : null,
      is_24h ? 1 : 0,
      notes || '',
      id
    ];
    
    await database.run(query, params);
    
    res.json({
      success: true,
      message: 'Horaires mis à jour avec succès'
    });
    
 
});

// Supprimer des horaires
router.delete('/:id', authenticateToken, async (req, res) => {
 
    
    const { id } = req.params;
    
    // Vérifier que les horaires existent
    const existingHours = await database.query('SELECT * FROM store_hours WHERE id = ?', [id]);
    if (existingHours.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Horaires non trouvés'
      });
    }
    
    await database.run('DELETE FROM store_hours WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Horaires supprimés avec succès'
    });
    
  
});

// Fonction pour synchroniser les horaires d'ouverture avec le planning
const syncStoreHoursToPlanning = async (storeId, startDate, endDate) => {
 
    
    // Récupérer les horaires d'ouverture du magasin
    const storeHours = await database.query(`
      SELECT * FROM store_hours 
      WHERE store_id = ? 
      ORDER BY day_of_week, time_slot_name
    `, [storeId]);
    
    console.log('🔍 Horaires trouvés pour le magasin', storeId, ':', storeHours.length);
    storeHours.forEach(h => {
      console.log('  📅 Jour', h.day_of_week, '-', h.time_slot_name, ':', h.open_time, '-', h.close_time, '(ouvert:', h.is_open, ', 24h:', h.is_24h, ')');
    });
    
    if (storeHours.length === 0) {
      return { success: false, message: 'Aucun horaire d\'ouverture trouvé pour ce magasin' };
    }
    
    // Récupérer les informations du magasin
    const store = await database.query('SELECT * FROM stores WHERE id = ?', [storeId]);
    if (store.length === 0) {
      return { success: false, message: 'Magasin non trouvé' };
    }
    
    const storeName = store[0].name;
    const createdTasks = [];
    
    // Générer les tâches pour chaque jour dans la plage de dates
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Mapping des jours de la semaine
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const dayName = dayNames[dayOfWeek]; // Nom du jour en anglais
      
      console.log(`🔍 Vérification du jour ${currentDate.toISOString().split('T')[0]} (${dayName})`);
      
      // Trouver les horaires pour ce jour de la semaine (par nom de jour)
      const dayHours = storeHours.filter(hour => hour.day_of_week === dayName);
      
      console.log(`📅 Horaires trouvés pour ${dayName}:`, dayHours.length);
      
      for (const hour of dayHours) {
        console.log('🔍 Vérification horaire:', {
          day: currentDate.toISOString().split('T')[0],
          hour: hour.time_slot_name,
          is_open: hour.is_open,
          is_24h: hour.is_24h,
          open_time: hour.open_time,
          close_time: hour.close_time
        });
        
        // Vérifier si l'horaire est valide (ouvert et pas 24h/24)
        const isValidHour = (hour.is_open === 1 || hour.is_open === true) && 
                           (hour.is_24h === 0 || hour.is_24h === false || hour.is_24h === null) &&
                           hour.open_time && hour.close_time;
        
        console.log('🔍 Validation horaire:', {
          is_open: hour.is_open,
          is_24h: hour.is_24h,
          open_time: hour.open_time,
          close_time: hour.close_time,
          isValid: isValidHour
        });
        
        if (isValidHour) {
          console.log('✅ Création d\'une tâche pour cet horaire');
          // Créer une tâche pour cet horaire
          const taskName = `${storeName} - Ouverture (${hour.time_slot_name || 'Standard'})`;
          const taskDescription = `Ouverture du magasin ${storeName} de ${hour.open_time} à ${hour.close_time}`;
          
          // Vérifier si une tâche similaire existe déjà pour cette date
          const existingTask = await database.query(`
            SELECT id FROM task_schedules 
            WHERE store_id = ? 
            AND scheduled_date = ? 
            AND start_time = ? 
            AND end_time = ?
          `, [storeId, currentDate.toISOString().split('T')[0], hour.open_time, hour.close_time]);
          
          if (existingTask.length === 0) {
            // D'abord, créer ou récupérer la tâche "Ouverture de magasin"
            let storeOpeningTask = await database.query(`
              SELECT id FROM tasks 
              WHERE name = ? AND category = 'store_operations'
            `, [`Ouverture de magasin - ${storeName}`]);
            
            let taskId;
            if (storeOpeningTask.length === 0) {
              // Créer la tâche si elle n'existe pas
              const taskResult = await database.run(`
                INSERT INTO tasks (
                  name, description, category, priority, estimated_duration, 
                  location, is_recurring, recurrence_pattern, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `, [
                `Ouverture de magasin - ${storeName}`,
                `Tâche d'ouverture du magasin ${storeName}`,
                'store_operations',
                'high',
                480, // 8 heures par défaut
                storeName,
                1, // récurrente
                'weekly',
                'active'
              ]);
              taskId = taskResult.lastID;
            } else {
              taskId = storeOpeningTask[0].id;
            }
            
            // Créer la tâche dans le planning (sans assignation initiale)
            const result = await database.run(`
              INSERT INTO task_schedules (
                task_id, assigned_to, store_id, scheduled_date, start_time, end_time, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [
              taskId,
              null, // Pas d'assignation initiale - sera assigné plus tard
              storeId,
              currentDate.toISOString().split('T')[0],
              hour.open_time,
              hour.close_time,
              taskDescription
            ]);
            
            createdTasks.push({
              id: result.lastID,
              task_name: taskName,
              scheduled_date: currentDate.toISOString().split('T')[0],
              start_time: hour.open_time,
              end_time: hour.close_time,
              store_name: storeName
            });
          }
        }
      }
      
      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      success: true,
      message: `${createdTasks.length} tâches d'ouverture créées`,
      tasks: createdTasks,
      debug: {
        storeHoursFound: storeHours.length,
        storeHoursDetails: storeHours.map(h => ({
          day: h.day_of_week,
          slot: h.time_slot_name,
          open: h.open_time,
          close: h.close_time,
          is_open: h.is_open,
          is_24h: h.is_24h
        })),
        dateRange: { start: startDate, end: endDate },
        totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
      }
    };
    
  
};

// Route pour synchroniser les horaires d'ouverture avec le planning
router.post('/sync-to-planning', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 SYNC API CALLED');
    console.log('📊 Request body:', req.body);
    
    const { store_id, start_date, end_date } = req.body;
    
    console.log('📊 Parsed params:', { store_id, start_date, end_date });
    
    if (!store_id || !start_date || !end_date) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'store_id, start_date et end_date sont requis'
      });
    }
    
    console.log('✅ All required fields present, calling sync function...');
    
    const result = await syncStoreHoursToPlanning(store_id, start_date, end_date);
    
    console.log('📊 Sync result:', result);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ Erreur synchronisation horaires vers planning:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation',
      error: error.message
    });
  }
});

