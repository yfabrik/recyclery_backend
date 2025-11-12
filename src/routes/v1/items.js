import express from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
const { Item, Categorie } = db;

export const router = express.Router();

// Obtenir tous les articles
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { recyclery_id, category_id, status } = req.query;
    const where = {};
    if (recyclery_id) where.recyclery_id = recyclery_id;
    if (category_id) where.category_id = category_id;
    if (status) where.status = status;

    const items = await Item.findAll({
      where,
    });

    res.json({ items });
  })
);

// Créer un nouvel article
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      category_id,
      barcode,
      purchase_price,
      selling_price,
      recyclery_id,
    } = req.body;

    if (!name || !recyclery_id) {
      return res.status(400).json({ error: "Nom et recyclerie requis" });
    }

    const item = await Item.create({
      name,
      description,
      category_id,
      barcode,
      purchase_price,
      selling_price,
      recyclery_id,
    });

    res.status(201).json({
      message: "Article créé avec succès",
      item,
    });
  })
);

// Obtenir les catégories
router.get(
  "/categories",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const categories = await Categorie.findAll();

    res.json({ categories });
  })
);
