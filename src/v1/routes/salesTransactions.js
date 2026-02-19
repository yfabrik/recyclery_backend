import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  createAvoir,
  createRefund,
  createTransaction,
  listRefunds,
  listTransactions,
  transactionsStats,
  transactionStatsPostalCode,
} from "../controllers/salesTransactions.js";

export const router = Router();
router.use(authenticateToken);

// GET - Récupérer les statistiques de résumé
router.get(
  "/stats/summary",
  authenticateToken,
  asyncHandler(transactionsStats),
);

// GET - Récupérer les statistiques par codes postaux
router.get(
  "/stats/postal-codes",
  authenticateToken,
  asyncHandler(transactionStatsPostalCode),
);

// GET - Récupérer les transactions
router.get("/", authenticateToken, asyncHandler(listTransactions));

// POST - Créer une nouvelle transaction (version simplifiée)
router.post("/", authenticateToken, asyncHandler(createTransaction));

// POST - Créer un remboursement
router.post("/refund", authenticateToken, asyncHandler(createRefund));

// GET - Récupérer les remboursements d'une transaction
router.get("/:id/refunds", authenticateToken, asyncHandler(listRefunds));

// POST - Créer un avoir (credit note)
router.post("/credit-note", authenticateToken, asyncHandler(createAvoir));
