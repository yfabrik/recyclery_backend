import { col, fn } from "sequelize";
import db from "../../models/index.js";

import createHttpError from "http-errors";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { listCaisses } from "./cashRegister.js";
const {
  CashSession,
  CashRegister,
  Recyclery,
  User,
  SalesTransaction,
  TransactionItem,
  LabeledItem,
  Category,
  Sequelize,
} = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
// 🧠 GET /cash-sessions
export const listCashSessions = async (req, res) => {
  const filterSchema = z.object({
    store_id: z.coerce.number().positive().optional(),
    user_id: z.coerce.number().positive().optional(),
    status: z.enum(["open", "close"]).optional(),
  });
  const data = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  if (data.store_id) where.store_id = data.store_id;
  if (data.status) where.status = data.status;
  if (data.user_id) where.user_id = data.user_id;

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
              Sequelize.col("SalesTransactions.total_amount"),
            ),
            0,
          ),
          "total_sales",
        ],
      ],
    },
    where,
    include: [
      {
        model: CashRegister,
        attributes: ["name"],
        include: [{ model: Recyclery, attributes: ["name"] }],
      },

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
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
// 🧠 GET /cash-sessions/active
export const getActiveSession = async (req, res) => {
  const userId = req.user.id;
  const session = await CashSession.findOne({
    where: {
      user_id: userId,
      status: "open",
    },
    include: [
      {
        model: CashRegister,
        attributes: ["name"],
        include: [{ model: Recyclery, attributes: ["name"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  let t;
  if (session) {
    const tmp = session.get({ plain: true });
    t = {
      ...tmp,
      CashRegister: session.CashRegister,
      Recyclery: session.CashRegister?.Recyclery,
    };
  }

  res.json({ success: true, session: t });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
// 🧠 POST /cash-sessions/open
export const openCashSession = async (req, res) => {
  const dataSchema = z.object({
    cash_register_id: idSchema("caisse requise"),
    store_id: idSchema("magasin requis"),
    opening_amount: z.coerce.number().positive("argent requis"),
    notes: z.string().nullish(),
  });
  const data = dataSchema.parse(req.body);

  const userId = req.user.id;
  const existing = await CashSession.findOne({
    where: { user_id: userId, status: "open" },
  });
  if (existing) throw new createHttpError.Conflict("Already open session");

  // const sessionNumber = `SES${Date.now().toString().slice(-8)}`;

  const session = await CashSession.create({
    // session_number: sessionNumber,
    user_id: userId,
    ...data,
  });

  res.status(201).json({
    success: true,
    session,
    session_id: session.id,
    // session_number: sessionNumber,
  });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
// 🧠 PUT /cash-sessions/:id/close
export const closeCashSession = async (req, res) => {
  const { id } = req.params;
  const dataSchema = z.object({
    closing_amount: z.coerce.number().positive("argent requis"),
    notes: z.string().nullish(),
  });
  const data = dataSchema.parse(req.body);
  const userId = req.user.id;

  const session = await CashSession.findOne({
    where: { id, user_id: userId, status: "open" },
  });
  if (!session)
    throw new createHttpError[404]("Session not found or already closed");

  const sales = await SalesTransaction.findAll({
    where: { cash_session_id: id },
    attributes: [
      [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
    ],
    raw: true,
  });

  const totalSales = parseFloat(sales[0].total_sales);
  const expected = session.opening_amount + totalSales;
  const difference = data.closing_amount - expected;

  await session.update({
    closing_amount: data.closing_amount,
    expected_amount: expected,
    // difference_amount: difference,
    closed_at: new Date(),
    status: "close",
    notes: data.notes || session.notes,
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
      {
        model: CashRegister,
        attributes: ["name"],
        include: [{ model: Recyclery, attributes: ["name"] }],
      },
      { model: User, attributes: ["username"] },
    ],
  });

  if (!session) return res.status(404).json({ success: false });

  // transactions with joined transaction_lines (transaction_items) info
  const transactions = await SalesTransaction.findAll({
    where: { cash_session_id: id },
    include: [
      {
        model: LabeledItem,
        as: "items",
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
  logger.info("called get register by store REMAKE THIS ONE");
  return await listCaisses(req, res);

  // const registers = await CashRegister.findAll({
  //   where: { store_id, is_active: 1 },
  //   include: [{ model: CashSession, as: "sessions", attributes: [] }],
  //   attributes: {
  //     include: [
  //       [fn("COUNT", col("cash_sessions.id")), "total_sessions"],
  //       [fn("MAX", col("cash_sessions.opened_at")), "last_session"],
  //     ],
  //   },
  //   group: ["CashRegister.id"],
  //   order: [["name", "ASC"]],
  // });

  // res.json({ success: true, registers });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const sessionsStats = async (req, res) => {
  const filtersSchema = z.object({
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
    store_id: idSchema().nullish(),
  })

  const filters = filtersSchema.parse(req.params)


  const where = {}
  if (filters.store_id) where.recyclery_id = filters.store_id
  const include = [
    {
      model: SalesTransaction,
      include: [{
        model: LabeledItem,
        as: "items",
        include: [{
          model: Category,
          as: "category"
        },
        {
          model: Category,
          as: "subcategory"
        }]
      }]
    }, {
      model: CashRegister,
      where
    }
  ]
  const stats = await CashSession.findAll({
    include
  })

  return res.json({
    success: true,
    data:
      stats.map(session => {
        return {
          transactions: session.SalesTransactions?.length ?? 0,
          cash: session.SalesTransactions?.reduce((prev, current) => {
            if (current.payment_method == "cash") {
              prev.count++
              prev.value += +(current.total_amount || 0)
            }
            return prev
          }, { count: 0, value: 0 }),
          card: session.SalesTransactions?.reduce((prev, current) => {
            if (current.payment_method == "card") {
              prev.count++
              prev.value += +(current.total_amount || 0)
            }
            return prev

          }, { count: 0, value: 0 }),
          categories: session.SalesTransactions?.reduce((prev, current) => {
            current.items?.forEach(item => {
              const categorie = item.category
              const sub = item.subcategory
              const val = { category: categorie.name, sub: sub?.name || "", value: item.total_amount }
              const exist = prev.find(p => p.category == val.category && p.sub == val.sub)
              if (exist) exist.value += val.value
              else prev.push(val)
            }
            )
            return prev
          }, [])

        }
      })

  })
}