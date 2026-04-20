import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { listSubcategories } from "../controllers/categories.js";

/**
 * @deprecated
 */
export const router = Router();

// Obtenir toutes les sous-catégories
router.get("/", asyncHandler(listSubcategories));
