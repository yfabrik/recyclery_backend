
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { createArrival, deleteArrival, detailArrival, listArrivals, updateArrival } from "../../controllers/arrivals.js";

export const router = Router();

// Obtenir tous les arrivages
router.get('/', authenticateToken, asyncHandler(listArrivals))

// Obtenir un arrivage spécifique
router.get('/:id', authenticateToken, asyncHandler(detailArrival))

// Créer un nouvel arrivage
router.post('/', authenticateToken, asyncHandler(createArrival))

// Mettre à jour un arrivage
router.put('/:id',
  authenticateToken,
  // requireRole(['admin', 'manager']), 
  asyncHandler(updateArrival))

// Supprimer un arrivage
router.delete('/:id',
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(deleteArrival))

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

