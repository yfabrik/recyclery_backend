const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = new sqlite3.Database('./database/recyclerie.db');

// Générer un numéro d'arrivage unique
const generateArrivalNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `ARR-${year}${month}${day}-${timestamp}`;
};

// Obtenir tous les arrivages
router.get('/', authenticateToken, (req, res) => {
  const { date_from, date_to, category_id, source_type, status } = req.query;
  
  let query = `
    SELECT 
      a.*,
      c.name as category_name,
      c.icon as category_icon,
      sc.name as subcategory_name,
      cp.name as collection_point_name,
      u.username as processed_by_name
    FROM arrivals a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN categories sc ON a.subcategory_id = sc.id
    LEFT JOIN collection_points cp ON a.collection_point_id = cp.id
    LEFT JOIN users u ON a.processed_by = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (date_from) {
    query += ' AND a.arrival_date >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    query += ' AND a.arrival_date <= ?';
    params.push(date_to);
  }
  
  if (category_id) {
    query += ' AND a.category_id = ?';
    params.push(category_id);
  }
  
  if (source_type) {
    query += ' AND a.source_type = ?';
    params.push(source_type);
  }
  
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY a.created_at DESC';

  db.all(query, params, (err, arrivals) => {
    if (err) {
      console.error('Erreur lors de la récupération des arrivages:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des arrivages'
      });
    }

    res.json({
      success: true,
      arrivals: arrivals
    });
  });
});

// Obtenir un arrivage spécifique
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT 
      a.*,
      c.name as category_name,
      c.icon as category_icon,
      sc.name as subcategory_name,
      cp.name as collection_point_name,
      u.username as processed_by_name
    FROM arrivals a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN categories sc ON a.subcategory_id = sc.id
    LEFT JOIN collection_points cp ON a.collection_point_id = cp.id
    LEFT JOIN users u ON a.processed_by = u.id
    WHERE a.id = ?
  `, [id], (err, arrival) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'arrivage:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'arrivage'
      });
    }

    if (!arrival) {
      return res.status(404).json({
        success: false,
        error: 'Arrivage non trouvé'
      });
    }

    res.json({
      success: true,
      arrival: arrival
    });
  });
});

// Créer un nouvel arrivage
router.post('/', authenticateToken, (req, res) => {
  const {
    category_id,
    subcategory_id,
    weight,
    arrival_date,
    arrival_time,
    source_type,
    source_details,
    collection_point_id,
    collection_point_name,
    collection_point_address,
    volunteer_donation,
    house_clearance,
    notes
  } = req.body;

  // Validation
  if (!category_id || !weight || !arrival_date || !source_type) {
    return res.status(400).json({
      success: false,
      error: 'La catégorie, le poids, la date d\'arrivage et le type de source sont requis'
    });
  }

  // Vérifier si la catégorie existe
  db.get('SELECT id FROM categories WHERE id = ?', [category_id], (err, category) => {
    if (err) {
      console.error('Erreur lors de la vérification de la catégorie:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Catégorie non trouvée'
      });
    }

    // Générer le numéro d'arrivage
    const arrivalNumber = generateArrivalNumber();

    // Créer l'arrivage
    const stmt = db.prepare(`
      INSERT INTO arrivals (
        arrival_number, category_id, subcategory_id, weight, arrival_date, arrival_time,
        source_type, source_details, collection_point_id, collection_point_name,
        collection_point_address, volunteer_donation, house_clearance, notes, processed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      arrivalNumber, category_id, subcategory_id, weight, arrival_date, arrival_time || new Date().toTimeString().slice(0,8),
      source_type, source_details, collection_point_id, collection_point_name,
      collection_point_address, volunteer_donation ? 1 : 0, house_clearance ? 1 : 0, notes, req.user.id
    ], function(err) {
      if (err) {
        console.error('Erreur lors de la création de l\'arrivage:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création de l\'arrivage'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Arrivage créé avec succès',
        arrival: {
          id: this.lastID,
          arrival_number: arrivalNumber,
          category_id,
          subcategory_id,
          weight,
          arrival_date,
          arrival_time: arrival_time || new Date().toTimeString().slice(0,8),
          source_type,
          source_details,
          collection_point_id,
          collection_point_name,
          collection_point_address,
          volunteer_donation: volunteer_donation ? 1 : 0,
          house_clearance: house_clearance ? 1 : 0,
          notes,
          processed_by: req.user.id,
          status: 'received'
        }
      });
    });

    stmt.finalize();
  });
});

// Mettre à jour un arrivage
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    subcategory_id,
    weight,
    arrival_date,
    arrival_time,
    source_type,
    source_details,
    collection_point_id,
    collection_point_name,
    collection_point_address,
    volunteer_donation,
    house_clearance,
    notes,
    status
  } = req.body;

  // Validation
  if (!category_id || !weight || !arrival_date || !source_type) {
    return res.status(400).json({
      success: false,
      error: 'La catégorie, le poids, la date d\'arrivage et le type de source sont requis'
    });
  }

  // Vérifier si l'arrivage existe
  db.get('SELECT * FROM arrivals WHERE id = ?', [id], (err, arrival) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'arrivage:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'arrivage'
      });
    }

    if (!arrival) {
      return res.status(404).json({
        success: false,
        error: 'Arrivage non trouvé'
      });
    }

    // Mettre à jour l'arrivage
    const stmt = db.prepare(`
      UPDATE arrivals 
      SET category_id = ?, subcategory_id = ?, weight = ?, arrival_date = ?, arrival_time = ?,
          source_type = ?, source_details = ?, collection_point_id = ?, collection_point_name = ?,
          collection_point_address = ?, volunteer_donation = ?, house_clearance = ?, notes = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run([
      category_id, subcategory_id, weight, arrival_date, arrival_time,
      source_type, source_details, collection_point_id, collection_point_name,
      collection_point_address, volunteer_donation ? 1 : 0, house_clearance ? 1 : 0, notes,
      status || 'received', id
    ], function(err) {
      if (err) {
        console.error('Erreur lors de la mise à jour:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la mise à jour de l\'arrivage'
        });
      }

      res.json({
        success: true,
        message: 'Arrivage mis à jour avec succès'
      });
    });

    stmt.finalize();
  });
});

// Supprimer un arrivage
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  // Vérifier si l'arrivage existe
  db.get('SELECT * FROM arrivals WHERE id = ?', [id], (err, arrival) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'arrivage:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'arrivage'
      });
    }

    if (!arrival) {
      return res.status(404).json({
        success: false,
        error: 'Arrivage non trouvé'
      });
    }

    // Supprimer l'arrivage
    const stmt = db.prepare('DELETE FROM arrivals WHERE id = ?');
    stmt.run([id], function(err) {
      if (err) {
        console.error('Erreur lors de la suppression:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la suppression de l\'arrivage'
        });
      }

      res.json({
        success: true,
        message: 'Arrivage supprimé avec succès'
      });
    });

    stmt.finalize();
  });
});

// Obtenir les statistiques des arrivages
router.get('/stats/summary', authenticateToken, (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (date_from) {
    whereClause += ' AND arrival_date >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND arrival_date <= ?';
    params.push(date_to);
  }

  db.get(`
    SELECT 
      COUNT(*) as total_arrivals,
      SUM(weight) as total_weight,
      COUNT(CASE WHEN source_type = 'collection_point' THEN 1 END) as from_collection_points,
      COUNT(CASE WHEN volunteer_donation = 1 THEN 1 END) as volunteer_donations,
      COUNT(CASE WHEN house_clearance = 1 THEN 1 END) as house_clearances,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as pending_processing,
      COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed
    FROM arrivals ${whereClause}
  `, params, (err, stats) => {
    if (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      });
    }

    res.json({
      success: true,
      stats: stats || {
        total_arrivals: 0,
        total_weight: 0,
        from_collection_points: 0,
        volunteer_donations: 0,
        house_clearances: 0,
        pending_processing: 0,
        processed: 0
      }
    });
  });
});

// Obtenir les arrivages par catégorie
router.get('/stats/by-category', authenticateToken, (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (date_from) {
    whereClause += ' AND a.arrival_date >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND a.arrival_date <= ?';
    params.push(date_to);
  }

  db.all(`
    SELECT 
      c.name as category_name,
      c.icon as category_icon,
      COUNT(a.id) as count,
      SUM(a.weight) as total_weight
    FROM arrivals a
    LEFT JOIN categories c ON a.category_id = c.id
    ${whereClause}
    GROUP BY c.id, c.name, c.icon
    ORDER BY total_weight DESC
  `, params, (err, stats) => {
    if (err) {
      console.error('Erreur lors de la récupération des statistiques par catégorie:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      });
    }

    res.json({
      success: true,
      categories: stats || []
    });
  });
});

module.exports = router;
