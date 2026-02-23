import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  createLabeledItem,
  deleteLabeledItem,
  getItemFromBarcode,
  listLabeledItem,
  tagItemAsSell,
  updateItem,
} from "../controllers/items.js";

export const router = Router();

// GET - Récupérer tous les articles étiquetés
router.get("/", asyncHandler(listLabeledItem));

// GET - Récupérer un article par son code-barres
router.get("/barcode/:barcode", asyncHandler(getItemFromBarcode));

// POST - Créer un nouvel article étiqueté
router.post("/", asyncHandler(createLabeledItem));

// PUT - Mettre à jour un article
router.put("/:id", asyncHandler(updateItem));

// DELETE - Supprimer un article
router.delete("/:id", asyncHandler(deleteLabeledItem));

// POST - Marquer un article comme vendu
router.post("/:id/sell", asyncHandler(tagItemAsSell));
