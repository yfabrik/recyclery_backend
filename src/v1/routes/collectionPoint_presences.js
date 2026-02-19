import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  createPointPrecense,
  deletePointPrecense,
  detailPointPrecense,
  listPointPrecense,
  updatePointPrecense,
} from "../controllers/collectionPointPrecense.js";

export const router = Router();

// Récupérer tous les jours de présence des points de collecte
router.get("/", authenticateToken, asyncHandler(listPointPrecense));

// Récupérer les jours de présence d'un point de collecte spécifique
router.get(
  "/collection-point/:collectionPointId",
  authenticateToken,
  asyncHandler(detailPointPrecense),
);

// Créer de nouveaux jours de présence
router.post("/", authenticateToken, asyncHandler(createPointPrecense));

// Mettre à jour des jours de présence
router.put("/:id", authenticateToken, asyncHandler(updatePointPrecense));

// Supprimer des jours de présence
router.delete("/:id", authenticateToken, asyncHandler(deletePointPrecense));
