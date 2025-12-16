import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createArrival,
  deleteArrival,
  detailArrival,
  listArrivals,
  statsByCategories,
  statsSummary,
  updateArrival,
} from "../controllers/arrivals.js";

export const router = Router();

// Obtenir tous les arrivages
router.get("/", authenticateToken, asyncHandler(listArrivals));

// Obtenir un arrivage spécifique
router.get("/:id", authenticateToken, asyncHandler(detailArrival));

// Créer un nouvel arrivage
router.post("/", authenticateToken, asyncHandler(createArrival));

// Mettre à jour un arrivage
router.put(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(updateArrival)
);

// Supprimer un arrivage
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(deleteArrival)
);

// Obtenir les statistiques des arrivages
router.get(
  "/stats/summary",
  authenticateToken,
  asyncHandler(statsSummary)
);

// Obtenir les arrivages par catégorie
router.get(
  "/stats/by-category",
  authenticateToken,
  asyncHandler(statsByCategories)
);
