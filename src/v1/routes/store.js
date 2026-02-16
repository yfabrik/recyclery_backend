import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../controllers/recycleries.js";
import { createCaisse, listCaisses } from "../controllers/cashRegister.js";
import logger from "../../services/logger.js";

export const router = Router();

const { LabeledItem, CashSession, Recyclery, CashRegister } = db;

// GET - Récupérer tous les magasins
router.get("/", authenticateToken, asyncHandler(listRecycleries));
// router.get("/all",authenticateToken, asyncHandler(listStoreWIthEmployee))

// GET - Récupérer un magasin par ID
router.get("/:id", authenticateToken, asyncHandler(detailRecyclerie));

// POST - Créer un nouveau magasin
router.post(
  "/",
  authenticateToken,
  // requireRole(["admin"]),
  asyncHandler(createRecyclerie),
);

// PUT - Mettre à jour un magasin
router.put(
  "/:id",
  authenticateToken,
  //  requireRole(["admin"]),
  asyncHandler(updateRecyclerie),
);

// DELETE - Supprimer un magasin
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(["admin"]),
  asyncHandler(deleteRecyclerie),
);

// GET - Récupérer les caisses d'un magasin
router.get("/:id/cash-registers", authenticateToken, asyncHandler(listCaisses));

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router");

    const { id } = req.params;
    const { name } = req.body;

    req.body.store_id = id;
    req.body.name = name;
    await createCaisse(req, res);
  }),
);
