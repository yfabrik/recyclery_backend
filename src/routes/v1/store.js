import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { createRecyclerie, detailRecyclerie, listRecycleries, updateRecyclerie } from "../../controllers/recycleries.js";
import { createCaisse, listCaisses } from "../../controllers/cashRegister.js";
import labeleditem from "../../models/labeleditem.js";

export const router = Router()

const { labeleditem, CashSession } = db;

// GET - Récupérer tous les magasins
router.get("/",
  authenticateToken,
  asyncHandler(listRecycleries))

// GET - Récupérer un magasin par ID
router.get("/:id", authenticateToken, asyncHandler(detailRecyclerie))

// POST - Créer un nouveau magasin
router.post("/",
  authenticateToken,
  // requireRole(["admin"]), 
  asyncHandler(createRecyclerie))

// PUT - Mettre à jour un magasin
router.put("/:id",
  authenticateToken,
  //  requireRole(["admin"]), 
  asyncHandler(updateRecyclerie))

// DELETE - Supprimer un magasin
router.delete("/:id",
  authenticateToken,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const items = await labeleditem.findAll({ where: { recyclery_id: id } })
    // Vérifier s'il y a des articles ou des sessions de caisse liés
    const checkQuery = `
    SELECT 
      (SELECT COUNT(*) FROM labeled_items WHERE store_id = ?) as items_count,
      (SELECT COUNT(*) FROM cash_sessions WHERE store_id = ?) as sessions_count
  `;

    db.get(checkQuery, [id, id], (err, row) => {
      if (err) {
        console.error("Erreur lors de la vérification des dépendances:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      if (row.items_count > 0 || row.sessions_count > 0) {
        return res.status(400).json({
          success: false,
          error:
            "Impossible de supprimer ce magasin car il contient des articles ou des sessions de caisse",
        });
      }

      // Supprimer d'abord les caisses associées
      db.run("DELETE FROM cash_registers WHERE store_id = ?", [id], (err) => {
        if (err) {
          console.error("Erreur lors de la suppression des caisses:", err);
          return res.status(500).json({ success: false, error: err.message });
        }

        // Puis supprimer le magasin
        db.run("DELETE FROM stores WHERE id = ?", [id], function (err) {
          if (err) {
            console.error("Erreur lors de la suppression du magasin:", err);
            return res.status(500).json({ success: false, error: err.message });
          }

          if (this.changes === 0) {
            return res
              .status(404)
              .json({ success: false, error: "Magasin non trouvé" });
          }

          res.json({ success: true, message: "Magasin supprimé avec succès" });
        });
      });
    });
  }))

// GET - Récupérer les caisses d'un magasin
router.get("/:id/cash-registers",
  authenticateToken,
  asyncHandler(
    listCaisses(req, res)
  ))

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    req.body.id = id
    req.body.name = name
    await createCaisse(req, res)

  }
  ))
