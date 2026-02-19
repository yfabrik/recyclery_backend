import createHttpError from "http-errors";
import db from "../../models/index.js";
import { col, fn, Op } from "sequelize";

const { Refund, Recyclery, User, SalesTransaction } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listRefunds = async (req, res) => {
  const { status, store_id, date_from, date_to } = req.query;

  const where = {};
  if (store_id) where.store_id = store_id;
  if (date_from) where.createdAt = { [Op.ge]: [date_from] };
  if (date_to) where.createdAt = { [Op.le]: [date_to] };
  const refunds = await Refund.findAll({
    where,
    include: [
      { model: Recyclery },
      { model: User },
      { model: SalesTransaction },
    ],
  });

  // Calculer le statut dynamique basé sur la date de création
  const refundsWithStatus = refunds.map((refund) => {
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(refund.created_at)) / (1000 * 60 * 60 * 24),
    );
    let computedStatus = "pending";

    if (refund.status === "completed") {
      computedStatus = "completed";
    } else if (daysSinceCreation > 30) {
      computedStatus = "expired";
    }

    return {
      ...refund,
      computed_status: computedStatus,
      days_since_creation: daysSinceCreation,
    };
  });

  res.json({ success: true, refunds: refundsWithStatus });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateRefund = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "completed"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Statut invalide",
    });
  }
  const refund = await Refund.findByPk(id);
  if (!refund) throw new createHttpError.NotFound();
  refund.status ??= status;
  await refund.save();

  res.json({
    success: true,
    message: "Statut mis à jour avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailRefund = async (req, res) => {
  const { id } = req.params;
  const refund = await Refund.findByPk(id, {
    include: [
      { model: SalesTransaction },
      { model: Recyclery },
      { model: User },
    ],
  });

  if (!refund) {
    return res.status(404).json({
      success: false,
      error: "Avoir non trouvé",
    });
  }

  // Calculer le statut dynamique
  const daysSinceCreation = Math.floor(
    (new Date() - new Date(refund.createdAt)) / (1000 * 60 * 60 * 24),
  );
  let computedStatus = "pending";

  if (refund.status === "completed") {
    computedStatus = "completed";
  } else if (daysSinceCreation > 30) {
    computedStatus = "expired";
  }

  res.json({
    success: true,
    refund: {
      ...refund,
      computed_status: computedStatus,
      days_since_creation: daysSinceCreation,
    },
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const refundStats = async (req, res) => {
  const { store_id, date_from, date_to } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (store_id) where.store_id = store_id;
  if (date_from) {
    where.createdAt = {
      ...(where.createdAt || {}),
      [Op.gte]: date_from,
    };
  }
  if (date_to) {
    where.createdAt = { ...(where.createdAt || {}), [Op.lte]: date_to };
  }

  const stats = await Refund.findAll({
    attributes: [
      "*",
      [fn("COUNT", col("*")), "total_refunds"],
      [fn("SUM", col("refund_amount")), "total_refund_amount"],
      [fn("AVG", col("refund_amount")), "average_refund_amount"],
      [
        fn("COUNT", fn("DISTINCT", col("refund_amount"))),
        "average_refund_amount",
      ],
    ],
    where,
    include: [{ model: SalesTransaction }],
  });

  const reasons = await Refund.findAll({
    attributes: [
      "reason",
      [fn("COUNT", col("*")), "count"],
      [fn("COALESCE", fn("SUM", col("refund_amount"), 0)), "total"],
    ],
    where,
    include: [{ model: SalesTransaction }],
    group: ["reason"],
  });

  // Statistiques par raison

  res.json({
    success: true,
    stats: {
      ...stats,
      reasons,
    },
  });
};
