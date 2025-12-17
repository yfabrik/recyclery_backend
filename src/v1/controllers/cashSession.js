import { fn, col } from "sequelize";
import db from "../../models/index.js";

import { listCaisses } from "./cashRegister.js";
const {
  CashSession,
  CashRegister,
  Recyclery,
  User,
  SalesTransaction,
  SalesItem,
  Sequelize,
} = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
// 🧠 GET /cash-sessions
export const listCashSessions = async (req, res) => {
  const { store_id, status, user_id } = req.query;
  const where = {};

  if (store_id) where.store_id = store_id;
  if (status) where.status = status;
  if (user_id) where.user_id = user_id;

  const sessions = await CashSession.findAll({
    attributes: {
      include: [
        [
          Sequelize.fn("COUNT", Sequelize.col("SalesTransactions.id")),
          "transactions_count",
        ],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn(
              "SUM",
              Sequelize.col("SalesTransactions.total_amount")
            ),
            0
          ),
          "total_sales",
        ],
      ],
    },
    where,
    include: [
      { model: CashRegister, attributes: ["name"] },
      { model: Recyclery, attributes: ["name"] },
      { model: User, attributes: ["username"] },
      {
        model: SalesTransaction,
        attributes: [],
      },
    ],
    group: ["CashSession.id"],
    order: [["createdAt", "DESC"]],
  });

  res.json({ success: true, sessions });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
// 🧠 GET /cash-sessions/active
export const getActiveSession = async (req, res) => {
  const userId = req.user.id;
  const session = await CashSession.findOne({
    where: { user_id: userId, status: "open" },
    include: [
      { model: CashRegister, attributes: ["name"] },
      { model: Recyclery, attributes: ["name"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json({ success: true, session });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
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
    user_id: 1,
    store_id,
    opening_amount,
    notes,
  });

  res.status(201).json({
    success: true,
    session,
    session_id: session.id,
    session_number: sessionNumber,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
// 🧠 PUT /cash-sessions/:id/close
export const closeCashSession = async (req, res) => {
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
    message: "Session fermée avec succès",
    expected_amount: expected,
    difference_amount: difference,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const getSessionById = async (req, res) => {
  const { id } = req.params;

  const session = await CashSession.findByPk(id, {
    include: [
      { model: CashRegister, attributes: ["name"] },
      { model: Recyclery, attributes: ["name"] },
      { model: User, attributes: ["username"] },
    ],
  });

  if (!session) return res.status(404).json({ success: false });

  // transactions with joined sales_items info
  const transactions = await SalesTransaction.findAll({
    where: { cash_session_id: id },
    include: [
      {
        model: SalesItem,
        // attributes: ["name", "barcode"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json({ success: true, session: { ...session.toJSON(), transactions } });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const getRegistersByStore = async (req, res) => {
  const { store_id } = req.params;
  if (!store_id)
    return res
      .status(400)
      .json({ success: false, message: "Missing store_id" });

  req.query.store_id = store_id;
  return await listCaisses(req, res);

  const registers = await CashRegister.findAll({
    where: { store_id, is_active: 1 },
    include: [{ model: CashSession, as: "sessions", attributes: [] }],
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
};
