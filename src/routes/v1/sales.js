import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
const { Sale, SaleItem, Item } = db;

export const router = Router();
router.use(authenticateToken);

// Obtenir toutes les ventes
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { recyclery_id } = req.query;
    const where = {};
    if (recyclery_id) where.recyclery_id = recyclery_id;

    const sales = await Sale.findAll();

    res.json({ sales });
  })
);

// Créer une nouvelle vente
router.post(
  "/",
  asyncHandler(async (req, res) => {
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
      0
    );
    const transaction = await db.sequelize.transaction();
    try {
      // 1️⃣ Create Sale
      const sale = await Sale.create(
        {
          customer_name,
          customer_email,
          total_amount,
          payment_method,
          sold_by: userId,
          recyclery_id,
        },
        { transaction }
      );

      // 2️⃣ Insert sale items
      const saleItems = await Promise.all(
        items.map(async (item) => {
          const saleItem = await SaleItem.create(
            {
              sale_id: sale.id,
              item_id: item.item_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
            },
            { transaction }
          );

          // 3️⃣ Mark the item as sold
          await Item.update(
            { status: "sold" },
            { where: { id: item.item_id }, transaction }
          );

          return saleItem;
        })
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
  })
);
