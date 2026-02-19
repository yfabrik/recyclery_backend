import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  detailRefund,
  listRefunds,
  refundStats,
  updateRefund,
} from "../controllers/refund.js";

export const router = Router();
// GET - Récupérer tous les avoirs
router.get("/", authenticateToken, asyncHandler(listRefunds));

// PUT - Mettre à jour le statut d'un avoir
router.put(
  "/:id/status",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(updateRefund),
);

// GET - Récupérer les détails d'un avoir
router.get("/:id", authenticateToken, asyncHandler(detailRefund));

// GET - Statistiques des avoirs
router.get("/stats/summary", authenticateToken, asyncHandler(refundStats));
