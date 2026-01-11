import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";


export const router = Router();

// Obtenir tous les arrivages
router.get("/", authenticateToken, asyncHandler(listArrivals));

// Obtenir un arrivage spécifique
router.get("/:id", authenticateToken, asyncHandler(detailArrival));

// Créer un nouvel arrivage
router.post("/", authenticateToken, asyncHandler(createArrival));

// Mettre à jour un arrivage
router.put(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(updateArrival)
);

// Supprimer un arrivage
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(deleteArrival)
);







