
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();
// Obtenir tous les dons/apports
router.get('/', authenticateToken, (req, res) => {
  const { recyclery_id, status } = req.query;
  
  let query = `
    SELECT d.*, 
           COALESCE(d.donor_email, d.donor_phone) as donor_contact,
           u.username as received_by_name
    FROM donations d
    LEFT JOIN users u ON d.received_by = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (recyclery_id) {
    query += ' AND d.recyclery_id = ?';
    params.push(recyclery_id);
  }
  
  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY d.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur de base de données' });
    }
    res.json({ donations: rows });
  });
});

// Créer un nouveau don
router.post('/', authenticateToken, (req, res) => {
  const { donor_name, donor_contact, item_description, estimated_value } = req.body;
  
  console.log('Données reçues pour création de don:', req.body);
  console.log('Utilisateur:', req.user);
  
  if (!donor_name || !item_description) {
    return res.status(400).json({ error: 'Nom du donateur et description requis' });
  }
  
  // Validation du estimated_value (optionnel mais doit être numérique si fourni)
  if (estimated_value !== undefined && estimated_value !== null && estimated_value !== '' && isNaN(parseFloat(estimated_value))) {
    return res.status(400).json({ error: 'La valeur estimée doit être un nombre valide' });
  }
  
  // Séparer email et téléphone du contact
  const isEmail = donor_contact && donor_contact.includes('@');
  const donor_email = isEmail ? donor_contact : null;
  const donor_phone = !isEmail ? donor_contact : null;
  
  // Vérifier que l'utilisateur est authentifié
  if (!req.user || !req.user.id) {
    console.error('Utilisateur non authentifié:', req.user);
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }
  
  const values = [donor_name, donor_phone, donor_email, item_description, estimated_value, 1, req.user.id];
  console.log('Valeurs pour INSERT:', values);
  
  const stmt = db.prepare(`
    INSERT INTO donations (donor_name, donor_phone, donor_email, item_description, estimated_value, recyclery_id, received_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(values, function(err) {
    if (err) {
      console.error('Erreur SQL lors de l\'enregistrement du don:', err);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du don', details: err.message });
    }
    
    res.status(201).json({
      message: 'Don enregistré avec succès',
      donation: {
        id: this.lastID,
        donor_name,
        donor_phone,
        donor_email,
        item_description,
        estimated_value,
        recyclery_id,
        status: 'pending'
      }
    });
  });
  stmt.finalize();
});

// PUT update donation
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { donor_name, donor_contact, item_description, estimated_value, status } = req.body;
  
  if (!donor_name || !item_description) {
    return res.status(400).json({ error: 'Nom du donateur et description requis' });
  }
  
  // Séparer email et téléphone du contact
  const isEmail = donor_contact && donor_contact.includes('@');
  const donor_email = isEmail ? donor_contact : null;
  const donor_phone = !isEmail ? donor_contact : null;
  
  const stmt = db.prepare(`
    UPDATE donations 
    SET donor_name = ?, donor_phone = ?, donor_email = ?, item_description = ?, estimated_value = ?, status = ?
    WHERE id = ?
  `);
  
  stmt.run([donor_name, donor_phone, donor_email, item_description, estimated_value, status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du don' });
    }
    
    res.json({ message: 'Don mis à jour avec succès' });
  });
  
  stmt.finalize();
});

// GET donation statistics
router.get('/stats', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS total_donations,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_donations,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_donations,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_donations,
      SUM(estimated_value) AS total_estimated_value
    FROM donations;
  `;
  
  db.get(query, (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération des statistiques des dons:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
    res.json({ stats: row });
  });
});


