import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createCaisse,
  deleteCaisse,
  detailCaisse,
  listCaisses,
  listCaissesMagasin,
  updateCaisse,
} from "../controllers/cashRegister.js";

export const router = Router();

// GET - Récupérer toutes les caisses
router.get("/", asyncHandler(listCaisses));

// GET - Récupérer une caisse par ID
router.get("/:id", asyncHandler(detailCaisse));

// POST - Créer une nouvelle caisse
router.post("/", asyncHandler(createCaisse));

// PUT - Mettre à jour une caisse
router.put("/:id", asyncHandler(updateCaisse));

// DELETE - Supprimer une caisse
router.delete("/:id", asyncHandler(deleteCaisse));

// GET - Récupérer les caisses d'un magasin (pour le popup d'ouverture)
router.get("/store/:store_id", asyncHandler(listCaissesMagasin));
