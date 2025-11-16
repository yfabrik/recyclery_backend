
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();

// Obtenir tous les points de collecte
router.get('/', authenticateToken, (req, res) => {
  const { active_only } = req.query;
  
  let query = `
    SELECT cp.*, r.name as recyclery_name
    FROM collection_points cp
    LEFT JOIN recycleries r ON cp.recyclery_id = r.id
  `;
  
  if (active_only === 'true') {
    query += ' WHERE cp.is_active = 1';
  }
  
  query += ' ORDER BY cp.name';

  db.all(query, (err, points) => {
    if (err) {
      console.error('Erreur lors de la récupération des points de collecte:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des points de collecte'
      });
    }

    res.json({
      success: true,
      collection_points: points
    });
  });
});

// Obtenir un point de collecte spécifique
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT cp.*, r.name as recyclery_name
    FROM collection_points cp
    LEFT JOIN recycleries r ON cp.recyclery_id = r.id
    WHERE cp.id = ?
  `, [id], (err, point) => {
    if (err) {
      console.error('Erreur lors de la récupération du point de collecte:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du point de collecte'
      });
    }

    if (!point) {
      return res.status(404).json({
        success: false,
        error: 'Point de collecte non trouvé'
      });
    }

    res.json({
      success: true,
      collection_point: point
    });
  });
});

// Créer un nouveau point de collecte
router.post('/', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const {
    name,
    address,
    city,
    postal_code,
    contact_person,
    contact_phone,
    contact_email,
    type,
    notes,
    recyclery_id
  } = req.body;

  // Validation
  if (!name || !address || !city || !postal_code) {
    return res.status(400).json({
      success: false,
      error: 'Le nom, l\'adresse, la ville et le code postal sont requis'
    });
  }

  // Vérifier si un point avec le même nom existe déjà
  db.get('SELECT id FROM collection_points WHERE name = ?', [name], (err, existing) => {
    if (err) {
      console.error('Erreur lors de la vérification:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification'
      });
    }

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Un point de collecte avec ce nom existe déjà'
      });
    }

    // Créer le point de collecte
    const stmt = db.prepare(`
      INSERT INTO collection_points (
        name, address, city, postal_code, contact_person, 
        contact_phone, contact_email, type, notes, recyclery_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      name, address, city, postal_code, contact_person,
      contact_phone, contact_email, type || 'standard', notes, recyclery_id
    ], function(err) {
      if (err) {
        console.error('Erreur lors de la création du point de collecte:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création du point de collecte'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Point de collecte créé avec succès',
        collection_point: {
          id: this.lastID,
          name,
          address,
          city,
          postal_code,
          contact_person,
          contact_phone,
          contact_email,
          type: type || 'standard',
          notes,
          recyclery_id,
          is_active: 1
        }
      });
    });

    stmt.finalize();
  });
});

// Mettre à jour un point de collecte
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;
  const {
    name,
    address,
    city,
    postal_code,
    contact_person,
    contact_phone,
    contact_email,
    type,
    notes,
    is_active,
    recyclery_id
  } = req.body;

  // Validation
  if (!name || !address || !city || !postal_code) {
    return res.status(400).json({
      success: false,
      error: 'Le nom, l\'adresse, la ville et le code postal sont requis'
    });
  }

  // Vérifier si le point existe
  db.get('SELECT * FROM collection_points WHERE id = ?', [id], (err, point) => {
    if (err) {
      console.error('Erreur lors de la récupération du point:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du point'
      });
    }

    if (!point) {
      return res.status(404).json({
        success: false,
        error: 'Point de collecte non trouvé'
      });
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    db.get('SELECT id FROM collection_points WHERE name = ? AND id != ?', [name, id], (err, existing) => {
      if (err) {
        console.error('Erreur lors de la vérification:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la vérification'
        });
      }

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Un point de collecte avec ce nom existe déjà'
        });
      }

      // Mettre à jour le point de collecte
      const stmt = db.prepare(`
        UPDATE collection_points 
        SET name = ?, address = ?, city = ?, postal_code = ?, 
            contact_person = ?, contact_phone = ?, contact_email = ?, 
            type = ?, notes = ?, is_active = ?, recyclery_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run([
        name, address, city, postal_code, contact_person,
        contact_phone, contact_email, type || 'standard', notes,
        is_active !== undefined ? is_active : 1, recyclery_id, id
      ], function(err) {
        if (err) {
          console.error('Erreur lors de la mise à jour:', err);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du point de collecte'
          });
        }

        res.json({
          success: true,
          message: 'Point de collecte mis à jour avec succès',
          collection_point: {
            id: parseInt(id),
            name,
            address,
            city,
            postal_code,
            contact_person,
            contact_phone,
            contact_email,
            type: type || 'standard',
            notes,
            is_active: is_active !== undefined ? is_active : 1,
            recyclery_id
          }
        });
      });

      stmt.finalize();
    });
  });
});

// Supprimer un point de collecte
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;

  // Vérifier si le point existe
  db.get('SELECT * FROM collection_points WHERE id = ?', [id], (err, point) => {
    if (err) {
      console.error('Erreur lors de la récupération du point:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération du point'
      });
    }

    if (!point) {
      return res.status(404).json({
        success: false,
        error: 'Point de collecte non trouvé'
      });
    }

    // Vérifier s'il y a des collectes programmées
    db.get('SELECT COUNT(*) as count FROM collection_schedules WHERE collection_point_id = ?', [id], (err, result) => {
      if (err) {
        console.error('Erreur lors de la vérification des collectes:', err);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la vérification'
        });
      }

      if (result.count > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer un point de collecte qui a des collectes programmées'
        });
      }

      // Supprimer le point de collecte
      const stmt = db.prepare('DELETE FROM collection_points WHERE id = ?');
      stmt.run([id], function(err) {
        if (err) {
          console.error('Erreur lors de la suppression:', err);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du point de collecte'
          });
        }

        res.json({
          success: true,
          message: 'Point de collecte supprimé avec succès'
        });
      });

      stmt.finalize();
    });
  });
});

// Obtenir les statistiques d'un point de collecte
router.get('/:id/stats', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT 
      COUNT(cs.id) as total_collections,
      COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_collections,
      COUNT(CASE WHEN cs.status = 'planned' THEN 1 END) as planned_collections,
      COUNT(CASE WHEN cs.status = 'cancelled' THEN 1 END) as cancelled_collections
    FROM collection_schedules cs
    WHERE cs.collection_point_id = ?
  `, [id], (err, stats) => {
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
        total_collections: 0,
        completed_collections: 0,
        planned_collections: 0,
        cancelled_collections: 0
      }
    });
  });
});

module.exports = router;
