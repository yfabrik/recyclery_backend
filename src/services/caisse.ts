import { col, fn } from "sequelize";
import db from "../models/index.js";
import type { Models, ModelWhere } from "../models/db-types.js";

const { CashRegister, CashSession, Recyclery } = db;

export type ListCashRegistersOptions = {
  store_id?: Models["Recyclery"]["id"];
  is_active?: boolean;
};

/**
 * List cash registers with store_name / total_sessions / last_session aggregates.
 * Sessions are joined only for COUNT/MAX (attributes: []), so nested sessions are not serialized.
 */
export const findCashRegistersWithAggregates = async (
  options: ListCashRegistersOptions = {},
) => {
  const where: ModelWhere<typeof CashRegister> = {};
  if (options.store_id != null) {
    where.recyclery_id = options.store_id;
  }
  if (options.is_active !== undefined) {
    where.is_active = options.is_active;
  }

  return CashRegister.findAll({
    attributes: {
      include: [
        [col("Recyclery.name"), "store_name"],
        [fn("COUNT", col("sessions.id")), "total_sessions"],
        [fn("MAX", col("sessions.createdAt")), "last_session"],
      ],
    },
    include: [
      {
        model: Recyclery,
        attributes: ["id", "name", "city", "is_active"],
        required: true,
      },
      {
        model: CashSession,
        as: "sessions",
        attributes: [],
        required: false,
      },
    ],
    where,
    group: ["CashRegister.id", "Recyclery.id"],
    order: [["name", "ASC"]],
  });
};

/** Active registers for a store (recyclery nested caisses list endpoint). */
export const listCaisses = async (store_id: Models["Recyclery"]["id"]) =>
  findCashRegistersWithAggregates({ store_id, is_active: true });

/**
 * @deprecated ?? used nowhere
 * @param user_id
 * @returns
 */
export const findOpenSession = (user_id: Models["User"]["id"]) => {
  const existingSession = CashSession.findAll({
    where: { user_id: user_id, status: "open" },
  });

  return existingSession;
};
