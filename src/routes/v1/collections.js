
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();

// Obtenir toutes les collectes
router.get('/', authenticateToken, (req, res) => {
  const { recyclery_id, status } = req.query;
  
  let query = `
    SELECT c.*, u.username as assigned_to_name
    FROM collections c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (recyclery_id) {
    query += ' AND c.recyclery_id = ?';
    params.push(recyclery_id);
  }
  
  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY c.collection_date ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur de base de données' });
    }
    res.json({ collections: rows });
  });
});

// Créer une nouvelle collecte
router.post('/', authenticateToken, (req, res) => {
  const { collection_date, address, contact_name, contact_phone, description, assigned_to, recyclery_id } = req.body;
  
  if (!collection_date || !address || !contact_name || !recyclery_id) {
    return res.status(400).json({ error: 'Date, adresse, contact et recyclerie requis' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO collections (collection_date, address, contact_name, contact_phone, description, assigned_to, recyclery_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([collection_date, address, contact_name, contact_phone, description, assigned_to, recyclery_id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la programmation de la collecte' });
    }
    
    res.status(201).json({
      message: 'Collecte programmée avec succès',
      collection: {
        id: this.lastID,
        collection_date,
        address,
        contact_name,
        contact_phone,
        description,
        assigned_to,
        recyclery_id,
        status: 'scheduled'
      }
    });
  });
  stmt.finalize();
});

module.exports = router;

