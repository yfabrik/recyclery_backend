import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listCaissesRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../controllers/recycleries.js";
import { createCaisse } from "../controllers/cashRegister.js";
import db from "../../models/index.js";
import { col, fn, Op, where } from "sequelize";

const { Recyclery, LabeledItem, SalesTransaction } = db;

export const router = Router();
router.use(authenticateToken);

// Obtenir toutes les recycleries
router.get("/", asyncHandler(listRecycleries));

// Obtenir une recyclerie par ID
router.get("/:id", asyncHandler(detailRecyclerie));

// Créer une nouvelle recyclerie
router.post(
  "/",
  // adminMiddleware,
  asyncHandler(createRecyclerie)
);

// Mettre à jour une recyclerie
router.put(
  "/:id",

  //   adminMiddleware,
  asyncHandler(updateRecyclerie)
);

// Supprimer une recyclerie
router.delete(
  "/:id",

  //   adminMiddleware,
  asyncHandler(deleteRecyclerie)
);

// Obtenir les statistiques d'une recyclerie
router.get(
  "/:id/stats",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const items = await LabeledItem.findOne({
      attributes: [
        [
          fn("COUNT", where(col("status"), "=", "available")),
          "available_items",
        ],
        [fn("COUNT", where(col("status"), "=", "sold")), "sold_items"],
        [fn("COUNT", where(col("status"), "=", "reserved")), "reserved_items"],
        [fn("COUNT", col("*")), "total_items"],
      ],
      where: {
        recyclery_id: id,
      },
      raw: true,
    });

    const sales = await SalesTransaction.findOne({
      attributes: [
        [fn("COUNT", col("*")), "monthly_sales"],
        [fn("COALESCE", fn("SUM", col("total_amount")), 0), "monthly_revenue"],
      ],
      where: {
        recyclery_id: id,
        createdAt: {
          [Op.gte]: new Date(new Date().setDate(1)), // Start of the current month
        },
      },
      raw: true,
    });

    res.json({
      stats: {
        ...items,
        ...sales,
      },
    });
  })
);

// GET - Récupérer les caisses d'un magasin
router.get(
  "/:id/cash-registers",

  asyncHandler(listCaissesRecyclerie)
);

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",

  //   requireRole(["admin", "manager"]),
  asyncHandler(createCaisse)
);
