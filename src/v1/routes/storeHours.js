import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  addHoraire,
  horairesMagasin,
  listHoraires,
  removeHoraires,
  updateHoraire,
} from "../controllers/storeHours.js";

export const router = Router();

// Récupérer tous les horaires des magasins
router.get("/",  asyncHandler(listHoraires));

// Récupérer les horaires d'un magasin spécifique
router.get("/store/:storeId",  asyncHandler(horairesMagasin));

// Créer de nouveaux horaires
router.post("/",  asyncHandler(addHoraire));

// Mettre à jour des horaires
router.put("/:id",  asyncHandler(updateHoraire));

// Supprimer des horaires
router.delete("/:id",  asyncHandler(removeHoraires));
