import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
const { User, Store } = db;

// GET - Récupérer tous les avoirs
router.get("/", authenticateToken, (req, res) => {
  const { status, store_id, date_from, date_to } = req.query;

  let query = `
    SELECT r.*, 
           st.transaction_number,
           st.total_amount as original_amount,
           s.name as store_name,
           u.username as created_by_name
    FROM refunds r
    LEFT JOIN sales_transactions st ON r.transaction_id = st.id
    LEFT JOIN stores s ON st.store_id = s.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE 1=1
  `;

  const params = [];

  if (store_id) {
    query += " AND st.store_id = ?";
    params.push(store_id);
  }

  if (date_from) {
    query += " AND DATE(r.created_at) >= ?";
    params.push(date_from);
  }

  if (date_to) {
    query += " AND DATE(r.created_at) <= ?";
    params.push(date_to);
  }

  query += " ORDER BY r.created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Erreur lors de la récupération des avoirs:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Calculer le statut dynamique basé sur la date de création
    const refundsWithStatus = rows.map((refund) => {
      const daysSinceCreation = Math.floor(
        (new Date() - new Date(refund.created_at)) / (1000 * 60 * 60 * 24)
      );
      let computedStatus = "pending";

      if (refund.status === "completed") {
        computedStatus = "completed";
      } else if (daysSinceCreation > 30) {
        computedStatus = "expired";
      }

      return {
        ...refund,
        computed_status: computedStatus,
        days_since_creation: daysSinceCreation,
      };
    });

    res.json({ success: true, refunds: refundsWithStatus });
  });
});

// PUT - Mettre à jour le statut d'un avoir
router.put("/:id/status", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Vérifier les permissions (admin ou manager)
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      error: "Permissions insuffisantes pour modifier le statut d'un avoir",
    });
  }

  if (!["pending", "completed"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Statut invalide",
    });
  }

  const updateQuery = `
    UPDATE refunds 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(updateQuery, [status, id], function (err) {
    if (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "Avoir non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Statut mis à jour avec succès",
    });
  });
});

// GET - Récupérer les détails d'un avoir
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT r.*, 
           st.transaction_number,
           st.total_amount as original_amount,
           st.payment_method,
           s.name as store_name,
           u.username as created_by_name
    FROM refunds r
    LEFT JOIN sales_transactions st ON r.transaction_id = st.id
    LEFT JOIN stores s ON st.store_id = s.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `;

  db.get(query, [id], (err, refund) => {
    if (err) {
      console.error("Erreur lors de la récupération de l'avoir:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: "Avoir non trouvé",
      });
    }

    // Calculer le statut dynamique
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(refund.created_at)) / (1000 * 60 * 60 * 24)
    );
    let computedStatus = "pending";

    if (refund.status === "completed") {
      computedStatus = "completed";
    } else if (daysSinceCreation > 30) {
      computedStatus = "expired";
    }

    res.json({
      success: true,
      refund: {
        ...refund,
        computed_status: computedStatus,
        days_since_creation: daysSinceCreation,
      },
    });
  });
});

// GET - Statistiques des avoirs
router.get("/stats/summary", authenticateToken, (req, res) => {
  const { store_id, date_from, date_to } = req.query;

  let baseQuery = `
    FROM refunds r
    LEFT JOIN sales_transactions st ON r.transaction_id = st.id
    WHERE 1=1
  `;

  const params = [];

  if (store_id) {
    baseQuery += " AND st.store_id = ?";
    params.push(store_id);
  }

  if (date_from) {
    baseQuery += " AND DATE(r.created_at) >= ?";
    params.push(date_from);
  }

  if (date_to) {
    baseQuery += " AND DATE(r.created_at) <= ?";
    params.push(date_to);
  }

  const statsQuery = `
    SELECT 
      COUNT(*) as total_refunds,
      COALESCE(SUM(r.refund_amount), 0) as total_refund_amount,
      COALESCE(AVG(r.refund_amount), 0) as average_refund,
      COUNT(DISTINCT st.store_id) as stores_count
    ${baseQuery}
  `;

  db.get(statsQuery, params, (err, stats) => {
    if (err) {
      console.error("Erreur lors du calcul des statistiques d'avoirs:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Statistiques par raison
    const reasonStatsQuery = `
      SELECT 
        r.reason,
        COUNT(*) as count,
        COALESCE(SUM(r.refund_amount), 0) as total
      ${baseQuery}
      GROUP BY r.reason
      ORDER BY total DESC
    `;

    db.all(reasonStatsQuery, params, (err, reasonStats) => {
      if (err) {
        console.error("Erreur lors du calcul des stats par raison:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        stats: {
          ...stats,
          reasons: reasonStats,
        },
      });
    });
  });
});
