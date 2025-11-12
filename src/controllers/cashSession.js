import { Op, fn, col, literal } from "sequelize";
import db from "../models/index.js";
const { CashSession, CashRegister, Store, User, SalesTransaction } = db;

// 🧠 GET /cash-sessions
export const listCashSessions = async (req, res) => {
  const { store_id, status, user_id } = req.query;
  const where = {};

  if (store_id) where.store_id = store_id;
  if (status) where.status = status;
  if (user_id) where.user_id = user_id;

  const sessions = await CashSession.findAll({
    where,
    include: [
      { model: CashRegister, attributes: ["name"] },
      //   { model: Store, as: "store", attributes: ["name"] },
      { model: User, attributes: ["username"] },
      {
        model: SalesTransaction,
        attributes: [],
      },
    ],
    // attributes: {
    //   include: [
    //     [fn("COUNT", col("sales_transactions.id")), "transactions_count"],
    //     [
    //       fn("COALESCE", fn("SUM", col("sales_transactions.total_amount")), 0),
    //       "total_sales",
    //     ],
    //   ],
    // },
    // group: ["CashSession.id"],
    // order: [["opened_at", "DESC"]],
  });

  res.json({ success: true, sessions });
};

// 🧠 GET /cash-sessions/active
export const getActiveSession = async (req, res) => {
  const userId = req.user.id;
  const session = await CashSession.findOne({
    where: { user_id: userId, status: "open" },
    include: [
      { model: CashRegister, as: "cash_register", attributes: ["name"] },
      { model: Store, as: "store", attributes: ["name"] },
    ],
    order: [["opened_at", "DESC"]],
  });

  res.json({ success: true, session });
};

// 🧠 POST /cash-sessions/open
export const openCashSession = async (req, res) => {
  const { cash_register_id, store_id, opening_amount, notes } = req.body;
  const userId = req.user.id;

  if (!cash_register_id || !store_id || opening_amount === undefined)
    return res.status(400).json({ success: false, message: "Missing fields" });

  const existing = await CashSession.findOne({
    where: { user_id: userId, status: "open" },
  });
  if (existing)
    return res
      .status(400)
      .json({ success: false, message: "Already open session" });

  const sessionNumber = `SES${Date.now().toString().slice(-8)}`;

  const session = await CashSession.create({
    session_number: sessionNumber,
    cash_register_id,
    user_id: userId,
    store_id,
    opening_amount,
    notes,
  });

  res.status(201).json({ success: true, session });
};

// 🧠 PUT /cash-sessions/:id/close
export const closeCashSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { closing_amount, notes } = req.body;
    const userId = req.user.id;

    if (closing_amount === undefined)
      return res
        .status(400)
        .json({ success: false, message: "Missing closing amount" });

    const session = await CashSession.findOne({
      where: { id, user_id: userId, status: "open" },
    });
    if (!session)
      return res.status(404).json({
        success: false,
        message: "Session not found or already closed",
      });

    const sales = await SalesTransaction.findAll({
      where: { cash_session_id: id },
      attributes: [
        [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
      ],
      raw: true,
    });

    const totalSales = parseFloat(sales[0].total_sales);
    const expected = parseFloat(session.opening_amount) + totalSales;
    const difference = parseFloat(closing_amount) - expected;

    await session.update({
      closing_amount,
      expected_amount: expected,
      difference_amount: difference,
      closed_at: new Date(),
      status: "closed",
      notes: notes || session.notes,
    });

    res.json({
      success: true,
      expected_amount: expected,
      difference_amount: difference,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await CashSession.findByPk(id, {
      include: [
        { model: CashRegister, as: "cash_register", attributes: ["name"] },
        { model: Store, as: "store", attributes: ["name"] },
        { model: User, as: "user", attributes: ["username"] },
      ],
    });

    if (!session) return res.status(404).json({ success: false });

    // transactions with joined sales_items info
    const transactions = await SalesTransaction.findAll({
      where: { cash_session_id: id },
      include: [
        {
          model: SalesItem,
          as: "sales_items",
          attributes: ["name", "barcode"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, session: { ...session.toJSON(), transactions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getRegistersByStore = async (req, res) => {
  try {
    const { store_id } = req.params;
    if (!store_id)
      return res
        .status(400)
        .json({ success: false, message: "Missing store_id" });

    const registers = await CashRegister.findAll({
      where: { store_id, is_active: 1 },
      include: [{ model: CashSession, as: "cash_sessions", attributes: [] }],
      attributes: {
        include: [
          [fn("COUNT", col("cash_sessions.id")), "total_sessions"],
          [fn("MAX", col("cash_sessions.opened_at")), "last_session"],
        ],
      },
      group: ["CashRegister.id"],
      order: [["name", "ASC"]],
    });

    res.json({ success: true, registers });
  } catch (err) {
    console.error("err", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
