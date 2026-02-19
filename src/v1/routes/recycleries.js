import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listCaissesRecyclerie,
  listRecycleries,
  recycleryStats,
  updateRecyclerie,
} from "../controllers/recycleries.js";
import { createCaisse } from "../controllers/cashRegister.js";
import { hasPermissions } from "../../middlewares/hasPermissions.js";

export const router = Router();
router.use(authenticateToken);
router.use(hasPermissions);

// Obtenir toutes les recycleries
router.get("/", asyncHandler(listRecycleries));

// Obtenir une recyclerie par ID
router.get("/:id", asyncHandler(detailRecyclerie));

// Créer une nouvelle recyclerie
router.post(
  "/",
  // adminMiddleware,
  asyncHandler(createRecyclerie),
);

// Mettre à jour une recyclerie
router.put(
  "/:id",

  //   adminMiddleware,
  asyncHandler(updateRecyclerie),
);

// Supprimer une recyclerie
router.delete(
  "/:id",

  //   adminMiddleware,
  asyncHandler(deleteRecyclerie),
);

// Obtenir les statistiques d'une recyclerie
router.get("/:id/stats", asyncHandler(recycleryStats));

// GET - Récupérer les caisses d'un magasin
router.get(
  "/:id/cash-registers",

  asyncHandler(listCaissesRecyclerie),
);

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",

  //   requireRole(["admin", "manager"]),
  asyncHandler(createCaisse),
);
