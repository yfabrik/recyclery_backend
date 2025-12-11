import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import {
  createRecyclerie,
  detailRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../../controllers/recycleries.js";
import { createCaisse, listCaisses } from "../../controllers/cashRegister.js";

export const router = Router();

const { LabeledItem, CashSession, Recyclery,CashRegister } = db;

// GET - Récupérer tous les magasins
router.get("/", authenticateToken, asyncHandler(listRecycleries));

// GET - Récupérer un magasin par ID
router.get("/:id", authenticateToken, asyncHandler(detailRecyclerie));

// POST - Créer un nouveau magasin
router.post(
  "/",
  authenticateToken,
  // requireRole(["admin"]),
  asyncHandler(createRecyclerie)
);

// PUT - Mettre à jour un magasin
router.put(
  "/:id",
  authenticateToken,
  //  requireRole(["admin"]),
  asyncHandler(updateRecyclerie)
);

// DELETE - Supprimer un magasin
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const items = await Labeleditem.findAll({ where: { recyclery_id: id } });
    const openSessions = await CashSession.findAll({
      where: { status: "open" },

      include: [
        {
          model: CashRegister,
          required: true,
          where: { recyclery_id: id }, // 🔥 filter registers linked to the store
          include: [
            {
              model: Recyclery,
              required: true,
            },
          ],
        },
      ],
    });

    if (items.length > 0 || openSessions.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Impossible de supprimer ce magasin car il contient des articles ou des sessions de caisse",
      });
    }
    const recyclery = await Recyclery.destroy({ where: { id } });

    res.json({ success: true, message: "Magasin supprimé avec succès" });
  })
);

// GET - Récupérer les caisses d'un magasin
router.get(
  "/:id/cash-registers",
  authenticateToken,
  asyncHandler(listCaisses)
);

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    req.body.store_id = id;
    req.body.name = name;
    await createCaisse(req, res);
  })
);
