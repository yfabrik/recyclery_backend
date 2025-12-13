import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { fn } from "sequelize";
import { createCollectionPoint, deleteCollectionPoint, detailCollectionPoint, listCollectionPoints, updateCollectionPoint } from "../controllers/collectionPoints.js";

const { CollectionSchedule } = db;
export const router = Router();

// Obtenir tous les points de collecte
router.get(
  "/",
  authenticateToken,
  asyncHandler(listCollectionPoints)
);

// Obtenir un point de collecte spécifique
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(detailCollectionPoint)
);

// Créer un nouveau point de collecte
router.post(
  "/",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(createCollectionPoint)
);

// Mettre à jour un point de collecte
router.put(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(updateCollectionPoint)
);

// Supprimer un point de collecte
router.delete(
  "/:id",
  authenticateToken,
  //  requireRole(["admin"]),
  asyncHandler(deleteCollectionPoint)
);

// Obtenir les statistiques d'un point de collecte
router.get(
  "/:id/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stats = await CollectionSchedule.findOne({
      attributes: [
        [
          fn("COUNT", where(col("status"), "=", "completed")),
          "completed_collections",
        ],
        [
          fn("COUNT", where(col("status"), "=", "planned")),
          "planned_collections",
        ],
        [
          fn("COUNT", where(col("status"), "=", "cancelled")),
          "cancelled_collections",
        ],
        [fn("COUNT", col("*")), "total_collections"],
      ],
      where: {
        collection_point_id: id,
      },
      raw: true,
    });

    res.json({
      success: true,
      stats: stats || {
        total_collections: 0,
        completed_collections: 0,
        planned_collections: 0,
        cancelled_collections: 0,
      },
    });
  })
);
