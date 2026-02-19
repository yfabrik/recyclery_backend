import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  detailRecyclerie,
  listRecycleries,
} from "../controllers/recycleries.js";
import {
  createStoreLocation,
  deleteStoreLocation,
  listStoreLocation,
  updateStoreLocation,
} from "../controllers/storeLocation.js";

export const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// GET /api/store-locations - Récupérer tous les lieux
router.get("/", asyncHandler(listRecycleries));

// GET /api/store-locations/:id - Récupérer un lieu par ID
router.get("/:id", asyncHandler(detailRecyclerie));

// POST /api/store-locations - Créer un nouveau lieu
router.post("/", asyncHandler(createStoreLocation));

// PUT /api/store-locations/:id - Mettre à jour un lieu
router.put("/:id", asyncHandler(updateStoreLocation));

// DELETE /api/store-locations/:id - Supprimer un lieu
router.delete("/:id", asyncHandler(deleteStoreLocation));

// GET /api/store-locations/store/:storeId - Récupérer les lieux d'un magasin spécifique
router.get("/store/:storeId", asyncHandler(listStoreLocation));
