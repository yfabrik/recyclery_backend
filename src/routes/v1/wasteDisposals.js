import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { createWaste, deleteWaste, detailWaste, listWaste, updateWaste } from "../../controllers/waste.js";
import { Op } from "sequelize";

const { WasteDisposal, Category, Sequelize } = db;
export const router = Router();
// Helper pour générer un numéro de sortie unique

// GET all waste disposals with filters
router.get(
  "/",
  authenticateToken,
  asyncHandler(listWaste)
);

// GET single waste disposal by ID
router.get(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(detailWaste)
);

// POST create new waste disposal
router.post(
  "/",
  authenticateToken,
  asyncHandler(createWaste)
);

// PUT update waste disposal
router.put(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "manage"),
  asyncHandler(updateWaste)
);

// DELETE waste disposal
router.delete(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "manage"),
  asyncHandler(deleteWaste)
);

// GET waste disposal statistics
router.get(
  "/stats/summary",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;

    const where = {};
    if (date_from) {
      where.disposal_date = {
        ...(where.disposal_date || {}),
        [Op.gte]: date_from,
      };
    }

    if (date_to) {
      where.disposal_date = {
        ...(where.disposal_date || {}),
        [Op.lte]: date_to,
      };
    }

    const stats = await WasteDisposal.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("*")), "total_disposals"],
        [Sequelize.fn("SUM", Sequelize.col("weight_kg")), "total_weight_kg"],
        [Sequelize.fn("SUM", Sequelize.col("volume_m3")), "total_volume_m3"],
        [
          Sequelize.fn("SUM", Sequelize.col("transport_cost")),
          "total_transport_cost",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"
            )
          ),
          "eco_organism_disposals",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"
            )
          ),
          "landfill_disposals",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"
            )
          ),
          "other_disposals",
        ],
      ],
      where,
    });

    res.json({ stats });
  })
);

// GET waste disposal statistics by category
router.get(
  "/stats/by-category",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;

    const where = {};
    if (date_from) {
      where.disposal_date = {
        ...(where.disposal_date || {}),
        [Op.gte]: date_from,
      };
    }

    if (date_to) {
      where.disposal_date = {
        ...(where.disposal_date || {}),
        [Op.lte]: date_to,
      };
    }

    const stats = await WasteDisposal.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("*")), "total_disposals"],
        [Sequelize.fn("SUM", Sequelize.col("weight_kg")), "total_weight_kg"],
        [Sequelize.fn("SUM", Sequelize.col("volume_m3")), "total_volume_m3"],
        [
          Sequelize.fn("SUM", Sequelize.col("transport_cost")),
          "total_transport_cost",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"
            )
          ),
          "eco_organism_disposals",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"
            )
          ),
          "landfill_disposals",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"
            )
          ),
          "other_disposals",
        ],
      ],
      where,
      include: [{ model: Category, as: "categorie" }],
      order: [["total_weight_kg", "DESC"]],
      group: ["id", "categorie.name"],
    });

    res.json({ stats });
  })
);
