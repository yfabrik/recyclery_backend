import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import { createCategorie, deleteCategorie, listCategories, listSubcategories, updateCategorie } from "../../controllers/categories.js";


export const router = Router();
router.use(authenticateToken);

// Obtenir toutes les catégories (principales et sous-catégories) en liste plate
router.get(
  "/",

  asyncHandler(listCategories)
);

// Créer une nouvelle catégorie ou sous-catégorie
router.post(
  "/",

  //  requireRole(["admin"]),
  asyncHandler(createCategorie)
);

// Mettre à jour une catégorie
router.put(
  "/:id",
  //  requireRole(["admin"]),
  asyncHandler(updateCategorie)
);

// Supprimer une catégorie
router.delete(
  "/:id",
  //   requireRole(["admin"]),
  asyncHandler(deleteCategorie)
);

// Obtenir la liste des icônes disponibles
router.get("/icons", (req, res) => {
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
    "Wine",
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

// Obtenir toutes les sous-catégories
router.get(
  "/subcategories",
  asyncHandler(listSubcategories)
);
