import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";
import logger from "../../services/logger.js";
const { SalesTransaction, TransactionItem, LabeledItem, User } = db;

/**
 * @deprecated
 */
export const router = Router();

// Obtenir toutes les ventes
router.get(
  "/",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in sales route FIXME", {
      query: req.query,
      referer: req?.headers?.referer,
    });

    const { recyclery_id } = req.query;
    /**
     * @type {import("sequelize").WhereOptions}
     */
    const where = {};
    if (recyclery_id) where.recyclery_id = recyclery_id;

    const sales = await SalesTransaction.findAll({
      where,
      include: [{ model: User }],
      order: [["createdAt", "DESC"]],
    });

    res.json({ sales });
  }),
);

// Créer une nouvelle vente
router.post(
  "/",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in sales route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const {
      customer_name,
      customer_email,
      items,
      payment_method = "cash",
      recyclery_id,
    } = req.body;

    if (!items || items.length === 0 || !recyclery_id) {
      return res.status(400).json({ error: "Articles et recyclerie requis" });
    }

    // Calculer le montant total
    const total_amount = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const transaction = await db.sequelize.transaction();
    try {
      // 1️⃣ Create Sale
      const sale = await SalesTransaction.create(
        {
          customer_name,
          customer_email,
          total_amount,
          payment_method,
          created_by: req.user.id,
          store_id: recyclery_id,
        },
        { transaction },
      );

      // 2️⃣ Insert sale items
      const saleItems = await Promise.all(
        items.map(async (item) => {
          const saleItem = await TransactionItem.create(
            {
              transaction_id: sale.id,
              labeled_item_id: item.item_id,
              quantity: item.quantity,
              price: item.unit_price,
              total_price: item.quantity * item.unit_price,
            },
            { transaction },
          );

          // 3️⃣ Mark the item as sold
          await LabeledItem.update(
            { status: "sold" },
            { where: { id: item.item_id }, transaction },
          );

          return saleItem;
        }),
      );

      // 4️⃣ Commit if everything succeeds
      await transaction.commit();

      res.status(201).json({
        sale: {
          id: sale.id,
          customer_name,
          customer_email,
          total_amount,
          payment_method,
          items: saleItems.length,
        },
      });
    } catch (err) {
      console.error("Transaction failed:", err);
      await transaction.rollback();
      res.status(500).json({ success: false, error: err.message });
    }
  }),
);
