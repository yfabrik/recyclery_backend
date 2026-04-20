import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
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
router.get("/", asyncHandler(listCollectionPoints));

// Obtenir un point de collecte spécifique
router.get("/:id", asyncHandler(detailCollectionPoint));

// Créer un nouveau point de collecte
router.post("/", asyncHandler(createCollectionPoint));

// Mettre à jour un point de collecte
router.put("/:id", asyncHandler(updateCollectionPoint));

// Supprimer un point de collecte
router.delete("/:id", asyncHandler(deleteCollectionPoint));

// Obtenir les statistiques d'un point de collecte
router.get("/:id/stats", asyncHandler(stats));
