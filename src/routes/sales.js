import { Router } from "express";
import db from "../../models/index.js";

import { asyncHandler } from "../middlewares/asyncHandler.js";
const { SalesTransaction, TransactionItem, CashSession, LabeledItem } = db;

export const router = Router();
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sale = await SalesTransaction.findAll();
    res.json(sale);
  }),
);

router.post(
  "/:caisseId/sales",
  asyncHandler(async (req, res) => {
    const { caisseId } = req.params;
    const { total_amount, payment_method, payment_amount, items } = req.body;

    const session = await CashSession.findOne({
      where: {
        cash_register_id: caisseId,
        status: "open",
      },
    });

    if (!session) {
      return res
        .status(400)
        .json({ error: "No open cash session for this register." });
    }

    const transaction = await SalesTransaction.create({
      cash_session_id: 1,
      store_id: 1,
      total_amount,
      payment_method,
      payment_amount,
      change_amount: payment_amount - total_amount,
      customer_name: "mr x",
      customer_email: "a@example.com",
      //   created_by: req.user.id, // cashier
    });

    for (const { labeled_item_id, quantity, price } of items) {
      await TransactionItem.create({
        transaction_id: transaction.id,
        labeled_item_id,
        price,
        quantity,
        total_price: quantity * price,
      });

      // Mark the item as sold
      // await LabeledItem.update(
      //   { status: "sold", sold_at: new Date(), sold_by: req.user.id },
      //   { where: { id: labeled_item_id } }
      // );
    }

    const fullSale = await SalesTransaction.findByPk(transaction.id, {
      include: [
        { model: TransactionItem },
        // { model: User, as: "cashier", attributes: ["id", "username"] },
      ],
    });

    res.json(fullSale);
  }),
);
