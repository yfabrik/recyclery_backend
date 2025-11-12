import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { listSubcategories } from "../../controllers/categories.js";

export const router = Router();
router.use(authenticateToken);

// Obtenir toutes les sous-catégories
router.get(
  "/",
  asyncHandler(listSubcategories)
)

