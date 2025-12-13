import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";
import {
  createArrival,
  deleteArrival,
  detailArrival,
  listArrivals,
  updateArrival,
} from "../controllers/arrivals.js";
import { Op } from "sequelize";

const { Sequelize, Arrival, Category } = db;

export const router = Router();

// Obtenir tous les arrivages
router.get("/", authenticateToken, asyncHandler(listArrivals));

// Obtenir un arrivage spécifique
router.get("/:id", authenticateToken, asyncHandler(detailArrival));

// Créer un nouvel arrivage
router.post("/", authenticateToken, asyncHandler(createArrival));

// Mettre à jour un arrivage
router.put(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(updateArrival)
);

// Supprimer un arrivage
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(['admin', 'manager']),
  asyncHandler(deleteArrival)
);

// Obtenir les statistiques des arrivages
router.get(
  "/stats/summary",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;

    const where = {};

    if (date_from) {
      where.arrival_date = {
        ...(where.arrival_date || {}),
        [Op.gte]: date_from,
      };
    }

    if (date_to) {
      where.arrival_date = { ...(where.arrival_date || {}), [Op.lte]: date_to };
    }

    const result = await Arrival.findOne({
      attributes: [
        // COUNT(*)
        [Sequelize.fn("COUNT", Sequelize.col("*")), "total_arrivals"],

        // SUM(weight)
        [Sequelize.fn("SUM", Sequelize.col("weight")), "total_weight"],

        // COUNT(CASE WHEN source_type = 'collection_point')
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(
              "CASE WHEN source_type = 'collection_point' THEN 1 END"
            )
          ),
          "from_collection_points",
        ],

        // volunteer_donation = 1
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal("CASE WHEN volunteer_donation = 1 THEN 1 END")
          ),
          "volunteer_donations",
        ],

        // house_clearance = 1
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal("CASE WHEN house_clearance = 1 THEN 1 END")
          ),
          "house_clearances",
        ],

        // status = 'received'
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal("CASE WHEN status = 'received' THEN 1 END")
          ),
          "pending_processing",
        ],

        // status = 'processed'
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal("CASE WHEN status = 'processed' THEN 1 END")
          ),
          "processed",
        ],
      ],

      where,
      raw: true,
    });

    res.json({
      success: true,
      stats: stats || {
        total_arrivals: 0,
        total_weight: 0,
        from_collection_points: 0,
        volunteer_donations: 0,
        house_clearances: 0,
        pending_processing: 0,
        processed: 0,
      },
    });
  })
);

// Obtenir les arrivages par catégorie
router.get(
  "/stats/by-category",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;
    const where = {};
    if (date_from) {
      where.arrival_date = {
        ...(where.arrival_date || {}),
        [Op.gte]: date_from,
      };
    }

    if (date_to) {
      where.arrival_date = { ...(where.arrival_date || {}), [Op.lte]: date_to };
    }

    const stats = await Arrival.findAll({
      attributes: {
        include: [


          [Sequelize.fn("COUNT", Sequelize.col("*")), "count"],
          [Sequelize.fn("SUM", Sequelize.col("weight")), "total_weight"],

        ]
      },
      include: [{ model: Category, as: "categorie" }],
    });

    res.json({
      success: true,
      categories: stats || [],
    });
  })
);
