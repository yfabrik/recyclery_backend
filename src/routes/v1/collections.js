import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { createCollection, listCollections } from "../../controllers/collections.js";



export const router = Router();

// Obtenir toutes les collectes
router.get(
  "/",
  authenticateToken,
  asyncHandler(listCollections)
);

// Créer une nouvelle collecte
router.post(
  "/",
  authenticateToken,
  asyncHandler(createCollection)
);
