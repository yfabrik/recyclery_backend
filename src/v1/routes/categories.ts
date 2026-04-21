import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  createCategorie,
  deleteCategorie,
  listCategories,
  patchCategory,
  updateCategorie,
} from "../controllers/categories.js";

export const router = Router();

// Obtenir toutes les catégories (principales et sous-catégories) en liste plate
router.get("/", asyncHandler(listCategories));

// Créer une nouvelle catégorie ou sous-catégorie
router.post("/", asyncHandler(createCategorie));

// Mettre à jour une catégorie
router.put("/:id", asyncHandler(updateCategorie));

// Supprimer une catégorie
router.delete("/:id", asyncHandler(deleteCategorie));

// Obtenir la liste des icônes disponibles
router.get("/icons", (_req, res) => {
  const icons = [
    "Category",
    "LocalLaundryService",
    "Chair",
    "Computer",
    "Checkroom",
    "Book",
    "Toys",
    "Kitchen",
    "Extension",
    "Phone",
    "Tv",
    "Watch",
    "Camera",
    "Headphones",
    "SportsEsports",
    "DirectionsBike",
    "DirectionsCar",
    "Home",
    "Bed",
    "Weekend",
    "TableRestaurant",
    "LocalDining",
    "Coffee",
    "WineBar",
    "Cake",
    "LocalFlorist",
    "Palette",
    "Brush",
    "ColorLens",
    "Draw",
    "Create",
    "Edit",
    "Build",
    "Construction",
    "Handyman",
    "ElectricalServices",
    "Plumbing",
    "Carpenter",
  ];

  res.json({
    success: true,
    icons: icons.sort(),
  });
});


router.patch("/:id", asyncHandler(patchCategory));
