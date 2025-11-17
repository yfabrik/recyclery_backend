import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { fn, literal, Op } from "sequelize";

import { createRefund, createTransaction, listRefunds, listTransactions } from "../../controllers/salesTransactions.js";
const { LabeledItem, Category, User, SalesTransaction, Store, Refund } = db;

export const router = Router();
router.use(authenticateToken);

// Route de test simple
router.get(
  "/test",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: "API Sales Transactions fonctionne",
      data: {
        transactionsCount: 0,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

// GET - Récupérer les statistiques de résumé
router.get(
  "/stats/summary",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { store_id, date_from, date_to } = req.query;

    const where = {};
    if (store_id) where.store_id = store_id;
    if (date_from && date_to)
      where.createdAt = { [Op.between]: [date_from, date_to] };

    // Subquery for total refunded amounts per transaction
    const refundSubquery = literal(`(
      SELECT 
        SUM(CASE WHEN refund_type IN ('full', 'partial') THEN refund_amount ELSE 0 END)
      FROM refunds AS r
      WHERE r.transaction_id = SalesTransaction.id
        AND r.status = 'completed'
    )`);

    // Fetch global stats
    const stats = await SalesTransaction.findAll({
      attributes: [
        [fn("COUNT", col("id")), "total_transactions"],
        [
          fn("COALESCE", fn("SUM", col("total_amount")), 0),
          "total_sales_before_refunds",
        ],
        [
          literal(
            "COALESCE(SUM(total_amount) - COALESCE(SUM((" +
            refundSubquery.val +
            ")), 0), 0)"
          ),
          "total_sales",
        ],
        [
          fn("COALESCE", fn("AVG", col("total_amount")), 0),
          "average_transaction",
        ],
        [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
        [
          fn("COALESCE", fn("SUM", literal(refundSubquery.val)), 0),
          "total_refunded",
        ],
      ],
      where,
      raw: true,
    });

    res.json({
      success: true,
      stats: {
        total_transactions: stats[0].total_transactions || 0,
        total_sales_before_refunds: parseFloat(
          stats[0].total_sales_before_refunds || 0
        ),
        total_sales: parseFloat(stats[0].total_sales || 0),
        total_refunded: parseFloat(stats[0].total_refunded || 0),
        average_transaction: parseFloat(stats[0].average_transaction || 0),
        sessions_count: stats[0].sessions_count || 0,
        payment_methods: paymentMethods.map((method) => ({
          payment_method: method.payment_method,
          count: method.count,
          total: parseFloat(method.total || 0),
        })),
      },
    });
  })
);

// GET - Récupérer les statistiques par codes postaux
router.get(
  "/stats/postal-codes",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { store_id, period, date_from, date_to } = req.query;
    const where = {};

    where.customer_postal_code = { [Op.ne]: null };
    if (store_id) where.store_id = store_id;
    if (date_from && date_to)
      where.createdAt = { [Op.between]: [date_from, date_to] };

    const postalStats = await SalesTransaction.findAll({
      where,
      attributes: [
        [fn("COUNT", col("id")), "total_transactions"],
        [
          fn("COALESCE", fn("AVG", col("total_amount")), 0),
          "average_transaction",
        ],
        [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
      ],
      group: ["customer_postal_code"],
      order: [["total_sales", "DESC"]],
    });

    res.json({
      success: true,
      postal_codes: postalStats.map((row) => ({
        customer_postal_code: row.customer_postal_code,
        transaction_count: row.transaction_count,
        total_sales: parseFloat(row.total_sales || 0),
        average_transaction: parseFloat(row.average_transaction || 0),
      })),
    });
  })
);

// GET - Récupérer les transactions
router.get(
  "/",
  authenticateToken,
  asyncHandler(listTransactions)
);

// POST - Créer une nouvelle transaction (version simplifiée)
router.post(
  "/",
  authenticateToken,
  asyncHandler(createTransaction)
);

// POST - Créer un remboursement
router.post(
  "/refund",
  authenticateToken,
  asyncHandler(createRefund)
);

// GET - Récupérer les remboursements d'une transaction
router.get(
  "/:id/refunds",
  authenticateToken,
  asyncHandler(listRefunds)
);

// POST - Créer un avoir (credit note)
router.post(
  "/credit-note",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { transaction_id, reason, credit_amount, notes } = req.body;

    if (!transaction_id || !reason || !credit_amount) {
      return res.status(400).json({
        success: false,
        message:
          "Les champs transaction_id, reason et credit_amount sont obligatoires",
      });
    }

    const transaction = await SalesTransaction.findByPk(transaction_id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée",
      });
    }

    if (parseFloat(credit_amount) > transaction.total_amount) {
      return res.status(400).json({
        success: false,
        message:
          "Le montant de l'avoir ne peut pas dépasser le montant de la transaction",
      });
    }

    // Créer l'avoir dans la table refunds (réutilisation de la même table)
    const creditNote = await Refund.create({
      transaction_id,
      refund_type: "credit_note",
      refund_amount: credit_amount,
      refund_reason: reason,
      refund_method: "credit_note",
      notes,
      created_by: req.user.id,
      status: "completed",
    });

    res.status(201).json({
      success: true,
      message: "Avoir créé avec succès",
      credit_note: creditNote,
    });
  })
);
