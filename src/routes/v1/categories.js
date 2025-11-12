import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op } from "sequelize";
const { Category } = db;

export const router = Router();
router.use(authenticateToken);
// Obtenir toutes les catégories (principales et sous-catégories) en liste plate
router.get(
  "/",

  asyncHandler(async (req, res) => {
    const categories = Category.findAll();

    res.json({
      success: true,
      categories,
    });
  })
);

// Créer une nouvelle catégorie ou sous-catégorie
router.post(
  "/",

  //  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { name, description, icon, parent_id } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Le nom est requis",
      });
    }

    // Utiliser une description par défaut si elle n'est pas fournie
    const finalDescription = description || "Aucune description";

    // Vérifier si la catégorie existe déjà
    const existingCategory = await Category.findOne({
      where: { name, parent_id },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: "Une catégorie avec ce nom existe déjà",
      });
    }
    const category = await Category.create({
      name,
      description,
      icon,
      parent_id,
    });

    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      category,
    });
  })
);

// Mettre à jour une catégorie
router.put(
  "/:id",
  //  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: "Le nom et la description sont requis",
      });
    }
    const category = await Category.findOne(id);

    // Vérifier si la catégorie existe
    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    }

    //TODO duplicate
    // Vérifier si le nouveau nom n'est pas déjà utilisé
    const existingCategory = await Category.findOne({
      where: { name, parent_id: category.parent_id },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: "Une catégorie avec ce nom existe déjà",
      });
    }
    category.name ??= name;
    category.icon ??= icon;
    category.description ??= description;
    category.parent_id ??= parent_id;
    await category.save();

    res.json({
      success: true,
      message: "Catégorie mise à jour avec succès",
      category,
    });
  })
);

// Supprimer une catégorie
router.delete(
  "/:id",
  //   requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    //TODO cascade delete les subcategories
    const deleted = await Category.destroy(id);
    if (deleted == 0)
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    // Vérifier si la catégorie existe

    res.json({
      success: true,
      message: "Catégorie supprimée avec succès",
    });
  })
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
  asyncHandler(async (req, res) => {
    const subcategories = await Category.findAll({
      where: { parent_id: { [Op.ne]: null } },
    });

    res.json({
      success: true,
      subcategories,
    });
  })
);
