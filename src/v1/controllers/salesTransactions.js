import createHttpError from "http-errors";
import { col, fn, literal, Op } from "sequelize";
import z from "zod";
import db from "../../models/index.js";
import {
  idSchema,
  postalSchema
} from "../../services/zod.js";

const {
  SalesTransaction,
  Recyclery,
  User,
  Refund,
  LabeledItem,
  CashSession,
  CashRegister,
} = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listTransactions = async (req, res) => {
  const filterSchema = z.object({
    store_id: z.preprocess(
      (val) => (val === "" ? undefined : val),
      idSchema().optional().nullable(),
    ),
    period: z.string().optional(),
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
    limit: z.coerce.number().positive().optional(),
    offset: z.coerce.number().nonnegative().default(0),
    session: idSchema().optional(),
    payment_method: z
      .enum(["cash", "check", "card"], "methode de payment inconnue")
      .optional(),
  });
  const filter = filterSchema.parse(req.query);

  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  // if (filter.store_id) where.recyclery_id = filter.store_id;
  if (filter.date_from || filter.date_to) {
    where.createdAt = {};
    if (filter.date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(filter.date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.createdAt[Op.gte] = dateFrom;
    }
    if (filter.date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(filter.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = dateTo;
    }
  }
  if (filter.session) where.cash_session_id = filter.session;
  if (filter.payment_method) where.payment_method = filter.payment_method;
  const include = [
    {
      model: CashSession,
      include: [
        {
          model: CashRegister,
          // ...(filter.store_id ? { where: { recyclery_id: filter.store_id } } : {}),
          include: [
            {
              model: Recyclery,
            },
          ],
        },
        {
          model: User,
        },
      ],
    },
    {
      model: LabeledItem,
      as: "items"
    }
  ];

  const transactions = await SalesTransaction.findAll({
    where,
    // include: [{ model: Recyclery ,}, { model: User }],
    include,
    order: [["createdAt", "DESC"]],
    limit: filter.limit,
    offset: filter.offset,
  });

  res.json({
    success: true,
    transactions: transactions,
    pagination: {
      limit: filter.limit,
      offset: filter.offset,
      total: transactions.length,
    },
  });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createTransaction = async (req, res) => {
  const itemSchema = z.object({
    name: z.string(),
    price: z.coerce.number("prix requis").positive(),
    quantity: z.coerce.number().positive().default(1),
    category_id: idSchema(),
    subcategory_id: idSchema().nullish(),
    weight: z.coerce.number("poid requis").nonnegative(),
    barcode: z.string(),
    promotion: z.coerce.number().min(0).max(100).nullish(),
    bundlePrice: z.coerce.number().nullish(),
    bundleQuantity: z.coerce.number().nullish()
  });
  const dataSchema = z.object({
    cash_session_id: idSchema("sesions requis"),
    total_amount: z.coerce.number("argent requis"),
    payment_method: z.enum(["cash", "card", "check"]).default("cash"),
    payment_amount: z.coerce.number("argent requis"),
    customer_postal_code: postalSchema().nullish(),
    items: z.array(itemSchema),
  });
  const data = dataSchema.parse(req.body);
  const session = await CashSession.findByPk(data.cash_session_id);
  if (!session) throw new createHttpError[404]("session non trouvé");

  const result = await db.sequelize.transaction(async t => {
    const sale = await session.createSalesTransaction(
      {
        total_amount: data.total_amount,
        payment_method: data.payment_method,
        payment_amount: data.payment_amount,
        customer_postal_code: data?.customer_postal_code || null,
      },
      { transaction: t })
    for await (const item of data.items) {
      if (isNaN(+item.barcode)) {
        await sale.createItem({
          category_id: item.category_id,
          subcategory_id: item.subcategory_id,
          price: item.price,
          weight: item.weight,
          status: "sold",
          sold_at: new Date(),
          created_by: req.user.id
        }, {
          through: {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            promotionValue: item.promotion,
            bundleQuantity: item.bundleQuantity,
            bundlePrice: item.bundlePrice
          },
          transaction: t,
        })
      }
      else {
        const i = await LabeledItem.findByPk(+item.barcode);
        if (!i) throw new createHttpError.NotFound("item not found");
        await i.update({
          sold_at: new Date(),
          status: "sold"
        }, { transaction: t })
        await sale.addItem(i, {
          through: {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            promotionValue: item.promotion,
            bundleQuantity: item.bundleQuantity,
            bundlePrice: item.bundlePrice
          },
          transaction: t,
        })
      }
    }
    return sale

  });

  res.json({
    success: true,
    data: {
      id: result.id,

      message: "Transaction créée avec succès",
      sale: result,
    },
  });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createRefund = async (req, res) => {
  const {
    transaction_id,
    refund_type,
    refund_amount,
    refund_reason,
    refund_method,
    notes,
  } = req.body;

  // Validation des champs requis
  if (!transaction_id || !refund_type || !refund_amount || !refund_reason) {
    return res.status(400).json({
      success: false,
      message:
        "Les champs transaction_id, refund_type, refund_amount et refund_reason sont obligatoires",
    });
  }

  // Vérifier que la transaction existe
  const transaction = await SalesTransaction.findByPk(transaction_id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction non trouvée",
    });
  }

  // Vérifier que le montant de remboursement ne dépasse pas le montant de la transaction
  if (refund_amount > (transaction.total_amount || 0)) {
    return res.status(400).json({
      success: false,
      message:
        "Le montant de remboursement ne peut pas dépasser le montant de la transaction",
    });
  }

  // Créer le remboursement dans la table refunds

  const refund = await Refund.create({
    transaction_id,
    refund_type,
    refund_amount,
    refund_reason,
    refund_method,
    notes,
    created_by: req.user.id,
    status: "completed",
  });

  // Mettre à jour le statut de la transaction si c'est un remboursement total
  if (refund_type === "full") {
    // Note: La table sales_transactions pourrait ne pas avoir de colonne status
    // On peut ajouter une colonne refunded_at pour marquer les transactions remboursées
    await SalesTransaction.update(
      { refundedAt: new Date() },
      { where: { id: transaction_id } },
    );
  }

  // Récupérer les informations du remboursement créé
  const refundInfo = await Refund.findOne({
    where: { id: refund.id },
    include: [{ model: SalesTransaction }, { model: User }],
  });

  res.status(201).json({
    success: true,
    message: "Remboursement créé avec succès",
    refund: refundInfo,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
//FIXME y'a le meme truc dans refunds
export const listRefunds = async (req, res) => {
  const { id } = req.params;

  const refunds = await Refund.findAll({
    where: { transaction_id: id },
    include: [{ model: SalesTransaction }],
  });
  if (!refunds[0]) {
    return res.status(404).json({
      success: false,
      message: "Transaction non trouvée",
    });
  }

  res.json({
    success: true,
    refunds: refunds,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const transactionsStats = async (req, res) => {
  const filterSchema = z.object({
    store_id: z.union([idSchema(), z.literal("")]).nullish(),
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
  });
  const filter = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.store_id) where.store_id = filter.store_id;

  const { date_from, date_to } = filter;
  if (date_from || date_to) {
    where.createdAt = {};
    if (date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.createdAt[Op.gte] = dateFrom;
    }
    if (date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = dateTo;
    }
  }

  // Subquery for total refunded amounts per transaction
  const refundSubquery = literal(`(
      SELECT 
        SUM(CASE WHEN refund_type IN ('full', 'partial') THEN refund_amount ELSE 0 END)
      FROM refunds AS r
      WHERE r.transaction_id = SalesTransaction.id
        AND r.status = 'completed'
    )`);

  // Fetch global stats
  const { count, rows } = await SalesTransaction.findAndCountAll({
    attributes: [
      [
        fn("COALESCE", fn("SUM", col("total_amount")), 0),
        "total_sales_before_refunds",
      ],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
      // [
      //   fn(
      //     "SUM",
      //     literal(`CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END`),
      //   ),
      //   "cash",
      // ],
      // [
      //   fn(
      //     "SUM",
      //     literal(`CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END`),
      //   ),
      //   "card",
      // ],
    ],
    raw: true,
  });
  // const stats = rows[0].get({ plain: true });
  const statsRow = rows[0] ?? {
    total_sales_before_refunds: 0,
    average_transaction: 0,
    sessions_count: 0,
  };
  const methods = await SalesTransaction.findAll({
    attributes: [
      "payment_method",
      [fn("SUM", col("total_amount")), "total"],
      [fn("COUNT", col("payment_method")), "count"],
    ],
    group: [["payment_method"]],
    raw: true,
  });

  // const stats = await SalesTransaction.findAll({
  //   attributes: [
  //     [fn("COUNT", col("id")), "total_transactions"],
  //     [
  //       fn("COALESCE", fn("SUM", col("total_amount")), 0),
  //       "total_sales_before_refunds",
  //     ],
  //     [
  //       literal(
  //         "COALESCE(SUM(total_amount) - COALESCE(SUM((" +
  //           refundSubquery.val +
  //           ")), 0), 0)",
  //       ),
  //       "total_sales",
  //     ],
  //     [
  //       fn("COALESCE", fn("AVG", col("total_amount")), 0),
  //       "average_transaction",
  //     ],
  //     [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
  //     [
  //       fn("COALESCE", fn("SUM", literal(refundSubquery.val)), 0),
  //       "total_refunded",
  //     ],
  //   ],
  //   where,
  //   raw: true,
  // });
  res.json({
    success: true,
    stats: {
      total_transactions: count,
      total_sales: statsRow.total_sales_before_refunds,
      ...statsRow,
      total_refunded: 0,
      payment_methods: methods ?? [],
      // total_sales_before_refunds: parseFloat(
      //   stats[0].total_sales_before_refunds || 0,
      // ),
      // total_sales: parseFloat(stats[0].total_sales || 0),
      // total_refunded: parseFloat(stats[0].total_refunded || 0),
      // average_transaction: parseFloat(stats[0].average_transaction || 0),
      // sessions_count: stats[0].sessions_count || 0,
      // payment_methods: stats.map((method) => ({
      //   payment_method: method.payment_method,
      //   count: method.count,
      //   total: parseFloat(method.total || 0),
      // })),
    },
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const transactionStatsPostalCode = async (req, res) => {
  const filterSchema = z.object({
    store_id: z.union([idSchema(), z.literal("")]).nullish(),
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
  });
  const filter = filterSchema.parse(req.query);
  const { store_id, date_from, date_to } = filter;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  const include = [];
  // include.push({ model: LabeledItem, as: "items" })
  where.customer_postal_code = { [Op.ne]: null };
  if (store_id) //where.store_id = store_id;
  {
    include.push({
      model: CashSession,
      include: [{ model: CashRegister, where: { recyclery_id: store_id } }],
    });
  }

  if (date_from || date_to) {
    where.createdAt = {};
    if (date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.createdAt[Op.gte] = dateFrom;
    }
    if (date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = dateTo;
    }
  }

  const postalStats = await SalesTransaction.findAll({
    where,
    include,
    attributes: [
      [fn("COUNT", col("SalesTransaction.id")), "transaction_count"],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
      "customer_postal_code"
    ],
    group: ["customer_postal_code"],
    order: [["total_sales", "DESC"]],
  });

  console.log(postalStats)

  res.json({
    success: true,
    postal_codes: postalStats,
  });
};

/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createAvoir = async (req, res) => {
  const { transaction_id, reason, credit_amount, notes } = req.body;

  if (!transaction_id || !reason || !credit_amount) {
    return res.status(400).json({
      success: false,
      message:
        "Les champs transaction_id, reason et credit_amount sont obligatoires",
    });
  }

  const transaction = await SalesTransaction.findByPk(transaction_id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction non trouvée",
    });
  }

  if (parseFloat(credit_amount) > transaction.total_amount) {
    return res.status(400).json({
      success: false,
      message:
        "Le montant de l'avoir ne peut pas dépasser le montant de la transaction",
    });
  }

  // Créer l'avoir dans la table refunds (réutilisation de la même table)
  const creditNote = await Refund.create({
    transaction_id,
    refund_type: "credit_note",
    refund_amount: credit_amount,
    refund_reason: reason,
    refund_method: "credit_note",
    notes,
    created_by: req.user.id,
    status: "completed",
  });

  res.status(201).json({
    success: true,
    message: "Avoir créé avec succès",
    credit_note: creditNote,
  });
};
