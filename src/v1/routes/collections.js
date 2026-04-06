import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createCollection,
  listCollections,
} from "../controllers/collections.js";

/**
 * @deprecated
 */
export const router = Router();

// Obtenir toutes les collectes
router.get("/",  asyncHandler(listCollections));

// Créer une nouvelle collecte
router.post("/",  asyncHandler(createCollection));
