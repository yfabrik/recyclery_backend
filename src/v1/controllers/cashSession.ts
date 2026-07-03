import { col, fn, type Includeable } from "sequelize";

import type { Request, Response } from "express";
import createHttpError from "http-errors";
import {
  cashSessionFilterSchema,
  cashSessionStatsFilterSchema,
  closeCashSessionSchema,
  openCashSessionSchema,
} from "@recyclerie/api/schemas/cashSession";
import type {
  ActiveCashSessionResponse,
  CashSessionsStatsResponse,
  CloseCashSessionResponse,
  DetailCashSessionResponse,
  ListCashSessionsResponse,
  OpenCashSessionResponse,
} from "@recyclerie/api/responses/cashSession";
import {
  apiCreated,
  apiData,
  apiResult,
} from "@recyclerie/api/types/response";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { listCaisses } from "./cashRegister.js";

import db from "../../models/index.js";
import type { ModelWhere, RequestWithUser } from "./types.js";
import {
  toCashSessionDto,
  toOptionalCashSessionDto,
  toCashSessionStatsItemDto,
} from "../../mappers/cashSession.js";

const {
  CashSession,
  CashRegister,
  Recyclery,
  User,
  SalesTransaction,
  LabeledItem,
  Category,
  TransactionPayment,
  TransactionGlobalPromotion,
} = db;

// 🧠 GET /cash-sessions
export const listCashSessions = async (req: Request, res: Response) => {
  const data = cashSessionFilterSchema.parse(req.query);

  const where: ModelWhere<typeof CashSession> = {};

  if (data.status) where.status = data.status;
  if (data.user_id) where.user_id = data.user_id;

  const whereRegister: ModelWhere<typeof CashRegister> = {};
  if (data.store_id) whereRegister.recyclery_id = data.store_id;

  const sessions = await CashSession.findAll({
    attributes: {
      include: [
        [fn("COUNT", col("SalesTransactions.id")), "transactions_count"],
        [
          fn("COALESCE", fn("SUM", col("SalesTransactions.total_amount")), 0),
          "total_sales",
        ],
      ],
    },
    where,
    include: [
      {
        model: CashRegister,
        attributes: ["id", "name", "is_active", "recyclery_id"],
        where: whereRegister,
        include: [
          { model: Recyclery, attributes: ["id", "name", "city", "is_active"] },
        ],
      },

      { model: User, attributes: ["id", "username", "email", "role"] },
      {
        model: SalesTransaction,
        attributes: [],
      },
    ],
    group: ["CashSession.id"],
    order: [["createdAt", "DESC"]],
  });

  res.json(
    apiData(sessions.map(toCashSessionDto)) satisfies ListCashSessionsResponse,
  );
};

// 🧠 GET /cash-sessions/active
export const getActiveSession = async (req: RequestWithUser, res: Response) => {
  const userId = req.user.id;
  const session = await CashSession.findOne({
    where: {
      user_id: userId,
      status: "open",
    },
    include: [
      {
        model: CashRegister,
        attributes: ["id", "name", "is_active", "recyclery_id"],
        include: [
          { model: Recyclery, attributes: ["id", "name", "city", "is_active"] },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json(
    apiData(toOptionalCashSessionDto(session)) satisfies ActiveCashSessionResponse,
  );
};

// 🧠 POST /cash-sessions/open
export const openCashSession = async (req: RequestWithUser, res: Response) => {
  const data = openCashSessionSchema.parse(req.body);

  const userId = req.user.id;
  await findByPkOrThrow(Recyclery, data.store_id, "Magasin non trouvé");
  await findByPkOrThrow(CashRegister, data.cash_register_id, "Caisse non trouvée");

  const existing = await CashSession.findOne({
    where: { user_id: userId, status: "open" },
  });
  if (existing)
    throw new createHttpError.Conflict("user already have opened session");

  //TODO check if cashregister work only if it is a real one
  // could do cashregister.createSession ?
  // no need for store_id ?
  const session = await CashSession.create({
    user_id: userId,
    ...data,
  });

  res
    .status(201)
    .json(
      apiCreated(toCashSessionDto(session)) satisfies OpenCashSessionResponse,
    );
};

// 🧠 PUT /cash-sessions/:id/close
export const closeCashSession = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = closeCashSessionSchema.parse(req.body);
  const userId = req.user.id;

  const session = await CashSession.findOne({
    where: { id, user_id: userId, status: "open" },
  });
  if (!session)
    throw new createHttpError[404]("Session not found or already closed");

  // const sales = await TransactionPayment.findAll({
  //   where: { method: "cash" },
  //   include: [{
  //     model: SalesTransaction,
  //     where: { cash_session_id: id },
  //     required: true,
  //     attributes:[]
  //   }],
  //   attributes: [
  //     [fn("COALESCE", fn("SUM", col("amount")), 0), "total_sales"],
  //   ],
  //   raw: true,
  //   // nest: true
  // })as unknown as{total_sales:number}[];
  // const sales = await SalesTransaction.findAll({
  //   where: { cash_session_id: id, payment_method: "cash" },
  //   attributes: [
  //     [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
  //   ],
  //   raw: true,
  // })as unknown as{total_sales:number}[];
  const sales = await SalesTransaction.findAll({
    where: {
      payment_method: ["cash", "mixed"],
      cash_session_id: id,
    },
    include: [
      {
        model: TransactionPayment,
        as: "payments",
      },
    ],
  });

  //TODO le calcul est similaire dans le front, faut verifier clean le calcul et merge dans utils
  const totalSales = sales.reduce((prev, current) => {
    if (current.payment_method == "cash")
      return current.transactionType == "sell"
        ? prev + current.total_amount
        : prev - current.total_amount;
    if (
      !current.payments ||
      current.payments.filter((payment) => payment.method == "cash").length == 0
    )
      return prev;

    const cashPayment = current.payments.reduce(
      (acc, pay) => (pay.method == "cash" ? acc : acc - pay.amount),
      current.total_amount,
    );
    return current.transactionType == "sell"
      ? prev + cashPayment
      : prev - cashPayment;
  }, 0);

  // const totalSales = parseFloat(String(sales[0]?.total_sales ?? 0));
  const expected = session.opening_amount + totalSales;
  const difference = data.closing_amount - expected;

  await session.update({
    closing_amount: data.closing_amount,
    expected_amount: expected,
    closed_at: new Date(),
    status: "close",
    notes: data.notes || session.notes,
  });

  res.json(
    apiResult(
      { expected_amount: expected, difference_amount: difference },
      "Session fermée avec succès",
    ) satisfies CloseCashSessionResponse,
  );
};

export const getSessionById = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const session = await findByPkOrThrow(CashSession, id, "session pas trouvé", {
    include: [
      {
        model: CashRegister,
        attributes: ["id", "name", "is_active", "recyclery_id"],
        include: [
          { model: Recyclery, attributes: ["id", "name", "city", "is_active"] },
        ],
      },
      { model: User, attributes: ["id", "username", "email", "role"] },
      {
        model: SalesTransaction,
        include: [
          { model: TransactionPayment, as: "payments" },
          { model: TransactionGlobalPromotion, as: "globalPromotions" },
          { model: LabeledItem, as: "items" },
        ],
      },
    ],
  });

  res.json(
    apiData(toCashSessionDto(session)) satisfies DetailCashSessionResponse,
  );
};

/**
 * @deprecated
 * @param req
 * @param res
 * @returns
 */
export const getRegistersByStore = async (req: Request, res: Response) => {
  const store_id = idSchema("Missing store_id").parse(req.params.store_id);

  req.query.store_id = store_id.toString();
  logger.fatal("called get register by store REMAKE THIS ONE");
  return await listCaisses(req, res);
};

export const sessionsStats = async (req: Request, res: Response) => {
  const filters = cashSessionStatsFilterSchema.parse(req.params);

  const where: ModelWhere<typeof CashRegister> = {};
  if (filters.store_id) where.recyclery_id = filters.store_id;
  const include: Includeable[] = [
    {
      model: SalesTransaction,
      include: [
        {
          model: LabeledItem,
          as: "items",
          include: [
            {
              model: Category,
              as: "category",
            },
            {
              model: Category,
              as: "subcategory",
            },
          ],
        },
      ],
    },
    {
      model: CashRegister,
      where,
    },
  ];
  const stats = await CashSession.findAll({
    include,
  });

  return res.json(
    apiData(
      stats.map((session) =>
        toCashSessionStatsItemDto({
          transactions: session.SalesTransactions?.length ?? 0,
          cash: (session.SalesTransactions ?? []).reduce(
            (prev, current) => {
              if (current.payment_method == "cash") {
                prev.count++;
                prev.value += +(current.total_amount || 0);
              }
              return prev;
            },
            { count: 0, value: 0 },
          ),
          card: (session.SalesTransactions ?? []).reduce(
            (prev, current) => {
              if (current.payment_method == "card") {
                prev.count++;
                prev.value += +(current.total_amount || 0);
              }
              return prev;
            },
            { count: 0, value: 0 },
          ),
          categories: (session.SalesTransactions ?? []).reduce(
            (prev, current) => {
              current.items?.forEach((item) => {
                const categorie = item.category;
                const sub = item.subcategory;
                const val = {
                  category: categorie?.name || "",
                  sub: sub?.name || "",
                  value: item.price,
                };
                const exist = prev.find(
                  (p) => p.category == val.category && p.sub == val.sub,
                );
                if (exist) exist.value += val.value;
                else prev.push(val);
              });
              return prev;
            },
            [] as { category: string; sub: string; value: number }[],
          ),
        }),
      ),
    ) satisfies CashSessionsStatsResponse,
  );
};
