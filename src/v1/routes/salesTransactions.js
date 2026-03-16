import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

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

// GET - Récupérer les statistiques de résumé
router.get("/stats/summary", asyncHandler(transactionsStats));

// GET - Récupérer les statistiques par codes postaux
router.get("/stats/postal-codes", asyncHandler(transactionStatsPostalCode));

// GET - Récupérer les transactions
router.get("/", asyncHandler(listTransactions));

// POST - Créer une nouvelle transaction (version simplifiée)
router.post("/", asyncHandler(createTransaction));

// POST - Créer un remboursement
router.post("/:id/refunds", asyncHandler(createRefund));

// GET - Récupérer les remboursements d'une transaction
router.get("/:id/refunds", asyncHandler(listRefunds));

// POST - Créer un avoir (credit note)
router.post("/credit-note", asyncHandler(createAvoir));
