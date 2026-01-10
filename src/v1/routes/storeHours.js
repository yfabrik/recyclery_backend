import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  addHoraire,
  horairesMagasin,
  listHoraires,
  removeHoraires,
  // syncHoraires,
  updateHoraire,
} from "../controllers/storeHours.js";

export const router = Router();
router.use(authenticateToken);

// Récupérer tous les horaires des magasins
router.get("/", authenticateToken, asyncHandler(listHoraires));

// Récupérer les horaires d'un magasin spécifique
router.get("/store/:storeId", authenticateToken, asyncHandler(horairesMagasin));

// Créer de nouveaux horaires
router.post("/", authenticateToken, asyncHandler(addHoraire));

// Mettre à jour des horaires
router.put("/:id", authenticateToken, asyncHandler(updateHoraire));

// Supprimer des horaires
router.delete("/:id", authenticateToken, asyncHandler(removeHoraires));

// Fonction pour synchroniser les horaires d'ouverture avec le planning

// Route pour synchroniser les horaires d'ouverture avec le planning
// router.post("/sync-to-planning", authenticateToken, asyncHandler(syncHoraires))

