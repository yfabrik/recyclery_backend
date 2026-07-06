import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import logger from "../../services/logger.js";
import { createCaisse, listCaisses } from "../controllers/cashRegister.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../controllers/recycleries.js";

export const router = Router();

// GET - Récupérer tous les magasins
router.get("/", asyncHandler(listRecycleries));

// GET - Récupérer un magasin par ID
router.get("/:id", asyncHandler(detailRecyclerie));

// POST - Créer un nouveau magasin
router.post("/", asyncHandler(createRecyclerie));

// PUT - Mettre à jour un magasin
router.put("/:id", asyncHandler(updateRecyclerie));

// DELETE - Supprimer un magasin
router.delete("/:id", asyncHandler(deleteRecyclerie));

// GET - Récupérer les caisses d'un magasin
router.get("/:id/cash-registers", asyncHandler(listCaisses));

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",

  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    logger.fatal("called useless fn in store route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const { id } = req.params;
    const { name } = req.body;

    req.body.store_id = id;
    req.body.name = name;
    await createCaisse(req, res);
  }),
);
