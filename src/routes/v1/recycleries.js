import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createCaisse,
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listCaissesRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../../controllers/recycleries.js";

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
// router.get(
//   "/:id/stats",
//
//   asyncHandler(async (req, res) => {
//     const { id } = req.params;

//     // Compter les éléments par statut
//     db.get(
//       `
//     SELECT
//       COUNT(CASE WHEN status = 'available' THEN 1 END) as available_items,
//       COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_items,
//       COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_items,
//       COUNT(*) as total_items
//     FROM items WHERE recyclery_id = ?
//   `,
//       [id],
//       (err, itemStats) => {
//         if (err) {
//           return res.status(500).json({ error: "Erreur de base de données" });
//         }

//         // Compter les ventes du mois
//         db.get(
//           `
//       SELECT
//         COUNT(*) as monthly_sales,
//         COALESCE(SUM(total_amount), 0) as monthly_revenue
//       FROM sales
//       WHERE recyclery_id = ? AND DATE(created_at) >= DATE('now', 'start of month')
//     `,
//           [id],
//           (err, salesStats) => {
//             if (err) {
//               return res
//                 .status(500)
//                 .json({ error: "Erreur de base de données" });
//             }

//             res.json({
//               stats: {
//                 ...itemStats,
//                 ...salesStats,
//               },
//             });
//           }
//         );
//       }
//     );
//   })
// );

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
