import db from "./models/index.js";

const {
  LabeledItem,
  TransactionItem,
  Category,
  SalesTransaction,
  TransactionPayment,
  CashSession,
  Sequelize,
} = db;

const sessions = await CashSession.findAll({ where: { status: "close" } });

sessions.forEach(async (session) => {
  const sales = await SalesTransaction.findAll({
    where: { cash_session_id: session.id, payment_method: "cash" },
    attributes: [
      [
        Sequelize.fn(
          "COALESCE",
          Sequelize.fn("SUM", Sequelize.col("total_amount")),
          0,
        ),
        "total_sales",
      ],
    ],
    raw: true,
  });
  session.expected_amount = session.opening_amount + sales[0].total_sales;
  await session.save();
});
