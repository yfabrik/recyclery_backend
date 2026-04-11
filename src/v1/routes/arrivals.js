import { Router } from "express";
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
router.get("/", asyncHandler(listArrivals));

// Obtenir un arrivage spécifique
router.get("/:id", asyncHandler(detailArrival));

// Créer un nouvel arrivage
router.post("/", asyncHandler(createArrival));

// Mettre à jour un arrivage
router.put("/:id", asyncHandler(updateArrival));

// Supprimer un arrivage
router.delete("/:id", asyncHandler(deleteArrival));

// Obtenir les statistiques des arrivages
router.get("/stats/summary", asyncHandler(statsSummary));

// Obtenir les arrivages par catégorie
router.get("/stats/by-category", asyncHandler(statsByCategories));
