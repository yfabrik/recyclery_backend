import express from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import { listCategories } from "../controllers/categories.js";
import { createLabeledItem, listLabeledItem } from "../controllers/items.js";

export const router = express.Router();

// Obtenir tous les articles
router.get("/", asyncHandler(listLabeledItem));

// Créer un nouvel article
router.post("/", asyncHandler(createLabeledItem));

// Obtenir les catégories
router.get("/categories", asyncHandler(listCategories));
