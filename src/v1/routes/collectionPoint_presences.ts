import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createPointPrecense,
  deletePointPrecense,
  detailPointPrecense,
  listPointPrecense,
  updatePointPrecense,
} from "../controllers/collectionPointPrecense.js";

export const router = Router();

// Récupérer tous les jours de présence des points de collecte
router.get("/", asyncHandler(listPointPrecense));

// Récupérer les jours de présence d'un point de collecte spécifique
router.get(
  "/collection-point/:collectionPointId",
  asyncHandler(detailPointPrecense),
);

// Créer de nouveaux jours de présence
router.post("/", asyncHandler(createPointPrecense));

// Mettre à jour des jours de présence
router.put("/:id", asyncHandler(updatePointPrecense));

// Supprimer des jours de présence
router.delete("/:id", asyncHandler(deletePointPrecense));
