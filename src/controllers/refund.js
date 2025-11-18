import db from "../models";

const { Refund, Recyclery, User, SalesTransaction } = db

export const listRefunds = async (req, res) => {
  const { status, store_id, date_from, date_to } = req.query;

  const where = {}
  if (store_id) where.store_id = store_id
  if (date_from) where.createdAt = { [Op.ge]: [date_from] };
  if (date_to) where.createdAt = { [Op.le]: [date_to] };
  const refunds = await Refund.findAll({
    where,
    include: [
      { model: Recyclery },
      { model: User },
      { model: SalesTransaction }
    ]
  })



  // Calculer le statut dynamique basé sur la date de création
  const refundsWithStatus = refunds.map((refund) => {
    const daysSinceCreation = Math.floor(
      (new Date() - new Date(refund.created_at)) / (1000 * 60 * 60 * 24)
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

}