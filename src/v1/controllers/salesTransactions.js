import { col, fn, literal, Op } from "sequelize";
import db from "../../models/index.js";
import z from "zod";
import createHttpError from "http-errors";

const { SalesTransaction, Recyclery, User, Refund, LabeledItem, CashSession } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listTransactions = async (req, res) => {
  const filterSchema = z.object({
    store_id: z.coerce.number().positive().optional(),
    // period,
    // date_from,
    // date_to,
    limit: z.coerce.number().positive().default(50),
    offset: z.coerce.number().nonnegative().default(0),
  })
  const filter = filterSchema.parse(req.query)
  const {
    store_id,
    period,
    date_from,
    date_to,
    limit = 50,
    offset = 0,
  } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.store_id) where.store_id = filter.store_id;
  // if (date_from) {
  //     where.createdAt = {
  //         ...(where.createdAt || {}),
  //         [Op.gte]: date_from,
  //     };
  // }
  // if (date_to) {
  //     where.createdAt = { ...(where.createdAt || {}), [Op.lte]: date_to };
  // }

  const transactions = await SalesTransaction.findAll({
    where,
    include: [{ model: Recyclery }, { model: User }],
    order: [["createdAt", "DESC"]],
    limit: filter.limit,
    offset: filter.offset
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
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createTransaction = async (req, res) => {
  const dataSchema = z.object({
    cash_session_id: z.coerce.number().positive("sesions requis"),
    store_id: z.coerce.number().positive("magasin requis"),
    total_amount: z.coerce.number("argent requis"),
    payment_method: z.enum(["cash", "card", "check"]).default("cash"),
    payment_amount: z.coerce.number("argent requis"),
    // change_amount = 0,
    customer_name: z.string().optional(),
    customer_email: z.string().optional(),
    customer_postal_code: z.string().optional(),
    items: z.array(z.union([z.number(), z.object({})])),
  })
  const data = dataSchema.parse(req.body)
  const t = await db.sequelize.transaction()
  const session = await CashSession.findByPk(data.cash_session_id)
  if (!session) throw new createHttpError[404]("session non trouvé")
  try {
    const sale = await session.createTransaction({
      total_amount: data.total_amount,
      payment_method: data.payment_method,
      payment_amount: data.payment_amount,
      customer_email: data?.customer_email || null,
      customer_name: data?.customer_name || null,
      customer_postal_code: data?.customer_postal_code || null
    }, { transaction: t })
    for await (const item of data.items) {
      if (typeof (item) == "number") {
        const i = await LabeledItem.findByPk(item)
        if (!i) throw new createHttpError.NotFound("item not found")
        i.transaction_id = sale.id
        i.status = "sold"
        i.sold_by = req.user.id
        i.sold_at = new Date()
        await i.save({ transaction: t })
      }
      else {
        const newItem = await LabeledItem.create({
          category_id: item.category_id,
          price: item.price,
          weight: item.weight,
          transaction_id: sale.id,
          status: "sold",
          sold_at: new Date(),
          sold_by: req.user.id
        }, { transaction: t })
      }
    }

    await t.commit()

    res.json({
      success: true,
      data: {
        id: sale.id,

        message: "Transaction créée avec succès",
        sale,
      },
    });
  } catch (err) {
    await t.rollback()
    throw err
  }


  // const {
  //   cash_session_id,
  //   store_id,
  //   total_amount,
  //   payment_method = "cash",
  //   payment_amount,
  //   change_amount = 0,
  //   customer_name,
  //   customer_email,
  //   customer_postal_code,
  //   items = [],
  // } = req.body;


  // // Générer un numéro de transaction unique
  // const timestamp = Date.now().toString();
  // const transactionNumber = `TXN${timestamp.slice(-8)}`;

  // // Insérer la transaction
  // const result = await SalesTransaction.create({
  //   transaction_number: transactionNumber,
  //   cash_session_id,
  //   store_id,
  //   total_amount,
  //   payment_method,
  //   payment_amount,
  //   change_amount,
  //   customer_name,
  //   customer_email,
  //   customer_postal_code,
  //   createdBy: req.user.id,
  // });

  // for await (const item of items) {
  //   if (!item.labeled_item_id) continue;
  //   const found = await LabeledItem.findOne({
  //     where: { barcode: item.barcode },
  //   });
  //   if (!found) continue;
  //   found.status = "sold";
  //   found.sold_at = new Date();
  //   found.transaction_id = result.id;
  //   await found.save();
  // }


};
/**
 *
 * @param {import("express").Request} req
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
  if (parseFloat(refund_amount) > transaction.total_amount) {
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
      { where: { id: transaction_id } }
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
  const { store_id, date_from, date_to } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (store_id) where.store_id = store_id;
  if (date_from && date_to)
    where.createdAt = { [Op.between]: [date_from, date_to] };

  // Subquery for total refunded amounts per transaction
  const refundSubquery = literal(`(
      SELECT 
        SUM(CASE WHEN refund_type IN ('full', 'partial') THEN refund_amount ELSE 0 END)
      FROM refunds AS r
      WHERE r.transaction_id = SalesTransaction.id
        AND r.status = 'completed'
    )`);

  // Fetch global stats
  const stats = await SalesTransaction.findAll({
    attributes: [
      [fn("COUNT", col("id")), "total_transactions"],
      [
        fn("COALESCE", fn("SUM", col("total_amount")), 0),
        "total_sales_before_refunds",
      ],
      [
        literal(
          "COALESCE(SUM(total_amount) - COALESCE(SUM((" +
          refundSubquery.val +
          ")), 0), 0)"
        ),
        "total_sales",
      ],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
      [
        fn("COALESCE", fn("SUM", literal(refundSubquery.val)), 0),
        "total_refunded",
      ],
    ],
    where,
    raw: true,
  });
  res.json({
    success: true,
    stats: {
      total_transactions: stats[0].total_transactions || 0,
      total_sales_before_refunds: parseFloat(
        stats[0].total_sales_before_refunds || 0
      ),
      total_sales: parseFloat(stats[0].total_sales || 0),
      total_refunded: parseFloat(stats[0].total_refunded || 0),
      average_transaction: parseFloat(stats[0].average_transaction || 0),
      sessions_count: stats[0].sessions_count || 0,
      payment_methods: stats.map((method) => ({
        payment_method: method.payment_method,
        count: method.count,
        total: parseFloat(method.total || 0),
      })),
    },
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const transactionStatsPostalCode = async (req, res) => {
  const { store_id, period, date_from, date_to } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  where.customer_postal_code = { [Op.ne]: null };
  if (store_id) where.store_id = store_id;
  if (date_from && date_to)
    where.createdAt = { [Op.between]: [date_from, date_to] };

  const postalStats = await SalesTransaction.findAll({
    where,
    attributes: [
      [fn("COUNT", col("id")), "total_transactions"],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
    ],
    group: ["customer_postal_code"],
    order: [["total_sales", "DESC"]],
  });

  res.json({
    success: true,
    postal_codes: postalStats.map((row) => ({
      customer_postal_code: row.customer_postal_code,
      transaction_count: row.transaction_count,
      total_sales: parseFloat(row.total_sales || 0),
      average_transaction: parseFloat(row.average_transaction || 0),
    })),
  });
};

/**
 *
 * @param {import("express").Request} req
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
