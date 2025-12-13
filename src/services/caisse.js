import { Op, Sequelize } from "sequelize";
import db from  "../models/index.js"

const { CashRegister, CashSession,Recyclery } = db;

export const listCaisses = async (store_id) => {
  const registers = await CashRegister.findAll({
    attributes: [
      "id",
      "name",
      "is_active",
      "created_at",
      [Sequelize.col("Recyclery.name"), "store_name"],
      // COUNT(cs.id) as total_sessions
      [
        Sequelize.fn("COUNT", Sequelize.col("CashSessions.id")),
        "total_sessions",
      ],
      // MAX(cs.opened_at) as last_session
      [
        Sequelize.fn("MAX", Sequelize.col("CashSessions.opened_at")),
        "last_session",
      ],
    ],
    include: [
      {
        model: Recyclery,
        attributes: [],
        required: false,
      },
      {
        model: CashSession,
        attributes: [],
        required: false,
      },
    ],
    where: { [Op.and]: [{ recyclery_id: store_id }, { is_active: true }] },
  });

  return registers;
};

export const findOpenSession = (user_id) => {
  const existingSession = CashSession.findAll({
    where: { user_id: user_id, status: "open" },
  });
  
  return existingSession;
};
