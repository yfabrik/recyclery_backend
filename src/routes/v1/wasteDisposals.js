const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { authenticateToken, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();
const db = new sqlite3.Database('./database/recyclerie.db');

// Helper pour générer un numéro de sortie unique
const generateDisposalNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `SORT-${timestamp}-${random}`;
};

// GET all waste disposals with filters
router.get('/', authenticateToken, (req, res) => {
  const { 
    category_id, 
    subcategory_id, 
    eco_organism_id, 
    disposal_type, 
    date_from, 
    date_to,
    page = 1,
    limit = 50
  } = req.query;

  let query = `
    SELECT 
      wd.id, wd.disposal_number, wd.disposal_date, wd.disposal_type,
      wd.weight_kg, wd.volume_m3, wd.transport_method, wd.transport_company,
      wd.transport_cost, wd.notes, wd.created_at, wd.updated_at,
      c.name AS category_name,
      sc.name AS subcategory_name,
      eo.name AS eco_organism_name,
      u.username AS created_by_name
    FROM waste_disposals wd
    LEFT JOIN categories c ON wd.category_id = c.id
    LEFT JOIN categories sc ON wd.subcategory_id = sc.id
    LEFT JOIN eco_organisms eo ON wd.eco_organism_id = eo.id
    LEFT JOIN users u ON wd.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) {
    query += ' AND wd.category_id = ?';
    params.push(category_id);
  }
  if (subcategory_id) {
    query += ' AND wd.subcategory_id = ?';
    params.push(subcategory_id);
  }
  if (eco_organism_id) {
    query += ' AND wd.eco_organism_id = ?';
    params.push(eco_organism_id);
  }
  if (disposal_type) {
    query += ' AND wd.disposal_type = ?';
    params.push(disposal_type);
  }
  if (date_from) {
    query += ' AND DATE(wd.disposal_date) >= DATE(?)';
    params.push(date_from);
  }
  if (date_to) {
    query += ' AND DATE(wd.disposal_date) <= DATE(?)';
    params.push(date_to);
  }

  query += ' ORDER BY wd.disposal_date DESC, wd.created_at DESC';

  // Add pagination
  const offset = (page - 1) * limit;
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des sorties de déchets:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM waste_disposals wd
      WHERE 1=1
    `;
    const countParams = [];

    if (category_id) {
      countQuery += ' AND wd.category_id = ?';
      countParams.push(category_id);
    }
    if (subcategory_id) {
      countQuery += ' AND wd.subcategory_id = ?';
      countParams.push(subcategory_id);
    }
    if (eco_organism_id) {
      countQuery += ' AND wd.eco_organism_id = ?';
      countParams.push(eco_organism_id);
    }
    if (disposal_type) {
      countQuery += ' AND wd.disposal_type = ?';
      countParams.push(disposal_type);
    }
    if (date_from) {
      countQuery += ' AND DATE(wd.disposal_date) >= DATE(?)';
      countParams.push(date_from);
    }
    if (date_to) {
      countQuery += ' AND DATE(wd.disposal_date) <= DATE(?)';
      countParams.push(date_to);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Erreur lors du comptage des sorties de déchets:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      res.json({
        disposals: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// GET single waste disposal by ID
router.get('/:id', authenticateToken, requireModuleAccess('waste.disposals', 'view'), (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      wd.id, wd.disposal_number, wd.disposal_date, wd.disposal_type,
      wd.weight_kg, wd.volume_m3, wd.transport_method, wd.transport_company,
      wd.transport_cost, wd.notes, wd.created_at, wd.updated_at,
      c.name AS category_name,
      sc.name AS subcategory_name,
      eo.name AS eco_organism_name,
      u.username AS created_by_name
    FROM waste_disposals wd
    LEFT JOIN categories c ON wd.category_id = c.id
    LEFT JOIN categories sc ON wd.subcategory_id = sc.id
    LEFT JOIN eco_organisms eo ON wd.eco_organism_id = eo.id
    LEFT JOIN users u ON wd.created_by = u.id
    WHERE wd.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération de la sortie de déchets:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Sortie de déchets non trouvée' });
    }
    res.json({ disposal: row });
  });
});

// POST create new waste disposal
router.post('/', authenticateToken, (req, res) => {
  const {
    disposal_date,
    category_id,
    subcategory_id,
    eco_organism_id,
    disposal_type,
    weight_kg,
    volume_m3,
    transport_method,
    transport_company,
    transport_cost,
    notes
  } = req.body;

  if (!disposal_date || !disposal_type || !weight_kg) {
    return res.status(400).json({ 
      error: 'Date de sortie, type de sortie et poids sont requis' 
    });
  }

  if (disposal_type === 'eco_organism' && !eco_organism_id) {
    return res.status(400).json({ 
      error: 'Éco-organisme requis pour ce type de sortie' 
    });
  }

  const disposal_number = generateDisposalNumber();

  const stmt = db.prepare(`
    INSERT INTO waste_disposals (
      disposal_number, disposal_date, category_id, subcategory_id,
      eco_organism_id, disposal_type, weight_kg, volume_m3,
      transport_method, transport_company, transport_cost, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    disposal_number,
    disposal_date,
    category_id || null,
    subcategory_id || null,
    eco_organism_id || null,
    disposal_type,
    weight_kg,
    volume_m3 || null,
    transport_method || null,
    transport_company || null,
    transport_cost || null,
    notes || null,
    req.user.id
  ], function(err) {
    if (err) {
      console.error('Erreur lors de la création de la sortie de déchets:', err);
      return res.status(500).json({ error: 'Erreur lors de la création de la sortie de déchets' });
    }
    res.status(201).json({ 
      message: 'Sortie de déchets créée avec succès', 
      disposal_id: this.lastID,
      disposal_number: disposal_number
    });
  });
  stmt.finalize();
});

// PUT update waste disposal
router.put('/:id', authenticateToken, requireModuleAccess('waste.disposals', 'manage'), (req, res) => {
  const { id } = req.params;
  const {
    disposal_date,
    category_id,
    subcategory_id,
    eco_organism_id,
    disposal_type,
    weight_kg,
    volume_m3,
    transport_method,
    transport_company,
    transport_cost,
    notes
  } = req.body;

  if (!disposal_date || !disposal_type || !weight_kg) {
    return res.status(400).json({ 
      error: 'Date de sortie, type de sortie et poids sont requis' 
    });
  }

  if (disposal_type === 'eco_organism' && !eco_organism_id) {
    return res.status(400).json({ 
      error: 'Éco-organisme requis pour ce type de sortie' 
    });
  }

  const stmt = db.prepare(`
    UPDATE waste_disposals 
    SET disposal_date = ?, category_id = ?, subcategory_id = ?,
        eco_organism_id = ?, disposal_type = ?, weight_kg = ?, volume_m3 = ?,
        transport_method = ?, transport_company = ?, transport_cost = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run([
    disposal_date,
    category_id || null,
    subcategory_id || null,
    eco_organism_id || null,
    disposal_type,
    weight_kg,
    volume_m3 || null,
    transport_method || null,
    transport_company || null,
    transport_cost || null,
    notes || null,
    id
  ], function(err) {
    if (err) {
      console.error('Erreur lors de la mise à jour de la sortie de déchets:', err);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de la sortie de déchets' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sortie de déchets non trouvée ou aucune modification' });
    }
    res.json({ message: 'Sortie de déchets mise à jour avec succès' });
  });
  stmt.finalize();
});

// DELETE waste disposal
router.delete('/:id', authenticateToken, requireModuleAccess('waste.disposals', 'manage'), (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM waste_disposals WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de la sortie de déchets:', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression de la sortie de déchets' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sortie de déchets non trouvée' });
    }
    res.json({ message: 'Sortie de déchets supprimée avec succès' });
  });
});

// GET waste disposal statistics
router.get('/stats/summary', authenticateToken, requireModuleAccess('waste.disposals', 'view'), (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = '';
  const params = [];
  
  if (date_from) {
    whereClause += ' AND DATE(disposal_date) >= DATE(?)';
    params.push(date_from);
  }
  if (date_to) {
    whereClause += ' AND DATE(disposal_date) <= DATE(?)';
    params.push(date_to);
  }

  const query = `
    SELECT 
      COUNT(*) AS total_disposals,
      SUM(weight_kg) AS total_weight_kg,
      SUM(volume_m3) AS total_volume_m3,
      SUM(transport_cost) AS total_transport_cost,
      SUM(CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END) AS eco_organism_disposals,
      SUM(CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END) AS landfill_disposals,
      SUM(CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END) AS other_disposals
    FROM waste_disposals 
    WHERE 1=1 ${whereClause}
  `;

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération des statistiques des sorties de déchets:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
    res.json({ stats: row });
  });
});

// GET waste disposal statistics by category
router.get('/stats/by-category', authenticateToken, requireModuleAccess('waste.disposals', 'view'), (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = '';
  const params = [];
  
  if (date_from) {
    whereClause += ' AND DATE(wd.disposal_date) >= DATE(?)';
    params.push(date_from);
  }
  if (date_to) {
    whereClause += ' AND DATE(wd.disposal_date) <= DATE(?)';
    params.push(date_to);
  }

  const query = `
    SELECT 
      c.name AS category_name,
      COUNT(*) AS disposal_count,
      SUM(wd.weight_kg) AS total_weight_kg,
      SUM(wd.volume_m3) AS total_volume_m3
    FROM waste_disposals wd
    LEFT JOIN categories c ON wd.category_id = c.id
    WHERE 1=1 ${whereClause}
    GROUP BY c.id, c.name
    ORDER BY total_weight_kg DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des statistiques par catégorie:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
    res.json({ stats: rows });
  });
});

module.exports = router;
