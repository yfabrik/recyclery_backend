import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";

import { detailRefund, listRefunds, updateRefund } from "../controllers/refund.js";
const { Refund, SalesTransaction, Recyclery, User, Sequelize } = db;

export const router = Router();
// GET - Récupérer tous les avoirs
router.get(
  "/",
  authenticateToken,
  asyncHandler(listRefunds)
);

// PUT - Mettre à jour le statut d'un avoir
router.put(
  "/:id/status",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(updateRefund)
);

// GET - Récupérer les détails d'un avoir
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(detailRefund)
);

// GET - Statistiques des avoirs
router.get(
  "/stats/summary",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { store_id, date_from, date_to } = req.query;

    const where = {};
    if (store_id) where.store_id = store_id;
    if (date_from) {
      where.createdAt = {
        ...(where.createdAt || {}),
        [Op.gte]: date_from,
      };
    }
    if (date_to) {
      where.createdAt = { ...(where.createdAt || {}), [Op.lte]: date_to };
    }

    const stats = await Refund.findAll({
      attributes: [
        "*",
        [fn("COUNT", Sequelize.col("*")), "total_refunds"],
        [fn("SUM", Sequelize.col("refund_amount")), "total_refund_amount"],
        [fn("AVG", Sequelize.col("refund_amount")), "average_refund_amount"],
        [
          fn("COUNT", fn("DISTINCT", Sequelize.col("refund_amount"))),
          "average_refund_amount",
        ],
      ],
      where,
      include: [{ model: SalesTransaction }],
    });

    const raison = await Refund({
      attributes: [
        "reason",
        [fn("COUNT", Sequelize.col("*")), "count"],
        [fn("COALESCE", fn("SUM", Sequelize.col("refund_amount"), 0)), "total"],
      ],
      where,
      include: [{ model: SalesTransaction }],
      group: ["reason"],
    });

    // Statistiques par raison

    res.json({
      success: true,
      stats: {
        ...stats,
        reasons,
      },
    });
  })
);
