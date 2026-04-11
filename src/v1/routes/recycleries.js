import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { createCaisse } from "../controllers/cashRegister.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listCaissesRecyclerie,
  listRecycleries,
  recycleryStats,
  updateRecyclerie,
} from "../controllers/recycleries.js";

export const router = Router();

// Obtenir toutes les recycleries
router.get("/", asyncHandler(listRecycleries));

// Obtenir une recyclerie par ID
router.get("/:id", asyncHandler(detailRecyclerie));

// Créer une nouvelle recyclerie
router.post("/", asyncHandler(createRecyclerie));

// Mettre à jour une recyclerie
router.put("/:id", asyncHandler(updateRecyclerie));

// Supprimer une recyclerie
router.delete("/:id", asyncHandler(deleteRecyclerie));

// Obtenir les statistiques d'une recyclerie
router.get("/:id/stats", asyncHandler(recycleryStats));

// GET - Récupérer les caisses d'un magasin
router.get("/:id/cash-registers", asyncHandler(listCaissesRecyclerie));

// POST - Créer une nouvelle caisse pour un magasin
router.post("/:id/cash-registers", asyncHandler(createCaisse));
