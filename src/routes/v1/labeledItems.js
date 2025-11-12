import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op, where } from "sequelize";
const { LabeledItem, Category, User } = db;

export const router = Router();
router.use(authenticateToken);

// GET - Récupérer tous les articles étiquetés
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, category_id, search } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (search) {
      const likeQuery = { [Op.like]: `%${search}%` };
      where[Op.or] = [
        { name: likeQuery },
        { description: likeQuery },
        { barcode: likeQuery },
      ];
    }

    const labeledItems = await LabeledItem.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: Category,
          as: "subcategory",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "created_by_user",
          attributes: ["id", "username"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, items: labeledItems });
  })
);

// GET - Récupérer un article par son code-barres
router.get(
  "/barcode/:barcode",
  asyncHandler(async (req, res) => {
    const { barcode } = req.params;

    const item = LabeledItem.findOne({ where: barcode });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, error: "Article non trouvé" });
    }

    res.json({ success: true, item });
  })
);

// POST - Créer un nouvel article étiqueté
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      category_id,
      subcategory_id,
      weight,
      price,
      cost,
      condition_state,
      location,
      arrival_id,
    } = req.body;

    // Validation des champs requis
    if (!category_id || !price) {
      return res.status(400).json({
        success: false,
        error: "La catégorie et le prix sont obligatoires",
      });
    }

    // Générer un code-barres unique (format: REC + timestamp + random)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const barcode = `REC${timestamp}${random}`;

    // Récupérer le nom de la catégorie pour l'utiliser comme nom de l'article
    const category = Category.findByPk(category_id);
    const articleName = category ? category.name : "Article";

    const item = await LabeledItem.create({
      barcode,
      name: articleName,
      description,
      category_id,
      subcategory_id,
      weight,
      price,
      cost,
      condition_state,
      location,
      arrival_id,
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Article créé avec succès",
      item,
    });
  })
);

// PUT - Mettre à jour un article
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      category_id,
      subcategory_id,
      weight,
      price,
      cost,
      condition_state,
      location,
      status,
    } = req.body;

    // Validation des champs requis
    if (!name || !category_id || !price) {
      return res.status(400).json({
        success: false,
        error: "Le nom, la catégorie et le prix sont obligatoires",
      });
    }

    const item = await LabeledItem.findByPk(id);

    const params = [
      name,
      description || null,
      category_id,
      subcategory_id || null,
      weight || null,
      price,
      cost || null,
      condition_state || "good",
      location || null,
      status || "available",
      id,
    ];

    const updated = {
      ...item,
      ...params,
    };

    const newLabel = await updated.save();

    res.json({ success: true, message: "Article mis à jour avec succès" });
  })
);

// DELETE - Supprimer un article
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await LabeledItem.destroy(id);

    if (deleted === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Article non trouvé" });
    }

    res.json({ success: true, message: "Article supprimé avec succès" });
  })
);

// POST - Marquer un article comme vendu
router.post(
  "/:id/sell",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updated = await LabeledItem.update(
      {
        status: "sold",
        sold_at: new Date(),
        sold_by: req.user.id,
      },
      {
        where: {
          id,
          status: "available",
        },
      }
    );

    res.json({ success: true, message: "Article marqué comme vendu" });
  })
);
