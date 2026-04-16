import { Op } from "sequelize";
import db from "../models/index.js";

const {
  LabeledItem,
  TransactionItem,
  Category,
  SalesTransaction,
  TransactionPayment,
} = db;

db.sequelize.sync().then(async () => {
  const transactions = await SalesTransaction.findAndCountAll({
    where: {
      transactionType: "sell",
    },
  });
  transactions.rows.forEach(async (trans) => {
    const method = trans.payment_method;
    const amount = trans.payment_amount;
    const time = trans.createdAt;
    const up = trans.updatedAt;
    await TransactionPayment.create({
      sales_transaction_id: trans.id,
      amount,
      method,
      createdAt: time,
      updatedAt: up,
    });
    // await trans.setPayments({ method: method, amount: amount })
  });
  const t = await SalesTransaction.findAll({
    include: [{ model: TransactionPayment, as: "payments" }],
  });
  console.log(t[0], t[0].payments);
});
