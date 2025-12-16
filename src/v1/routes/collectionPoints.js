import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createCollectionPoint,
  deleteCollectionPoint,
  detailCollectionPoint,
  listCollectionPoints,
  stats,
  updateCollectionPoint,
} from "../controllers/collectionPoints.js";

export const router = Router();

// Obtenir tous les points de collecte
router.get("/", authenticateToken, asyncHandler(listCollectionPoints));

// Obtenir un point de collecte spécifique
router.get("/:id", authenticateToken, asyncHandler(detailCollectionPoint));

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
router.get("/:id/stats", authenticateToken, asyncHandler(stats));
