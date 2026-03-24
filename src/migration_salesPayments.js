import { Op } from "sequelize";
import db from "./models/index.js";

const { LabeledItem, TransactionItem, Category, SalesTransaction ,TransactionPayment} = db;

db.sequelize.sync().then(async () => {
  const transactions = await SalesTransaction.findAndCountAll({
    where: { transactionType:"sell"
    },
  });
  transactions.rows.forEach(async trans=>{
    const method = trans.payment_method
    const amount = trans.payment_amount
    await trans.setPayments({ method:method,amount:amount})
  })
  const t = await SalesTransaction.findAll({include:[{model:TransactionPayment, as:"payments"}]})
  console.log(t[0])
});
