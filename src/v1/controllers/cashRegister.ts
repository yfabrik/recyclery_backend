import { col, fn } from "sequelize";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere } from "../../models/db-types.js";

const { CashRegister, Recyclery, CashSession } = db;

export const listCaisses = async (req: Request, res: Response) => {
  const store_id = idSchema().optional().parse(req.params.id);

  const filterSchema = z.object({
    is_active: z.coerce.boolean().optional(),
    store_id: idSchema().optional(), //TODO fix NAME ?
  });

  const filter = filterSchema.parse({ store_id, ...req.query });

  const where: ModelWhere<typeof CashRegister> = {};
  if (filter.store_id) {
    where.recyclery_id = filter.store_id;
  }

  if (filter.is_active !== undefined) {
    where.is_active = filter.is_active;
  }

  //TODO filter + COUNT sessions + last_session
  const cashRegister = await CashRegister.findAll({
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
        required: true,
      },
      {
        model: CashSession,
        as: "sessions",
        required: false,
      },
    ],
    where,
    group: ["CashRegister.id", "Recyclery.name"],
    order: [["name", "ASC"]],
  });

  res.json({
    success: true,
    data: cashRegister,
    cash_registers: cashRegister,
    registers: cashRegister,
  });
};

export const detailCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const register = await findByPkOrThrow(CashRegister, id, "Caisse non trouvée", {
    include: [
      {
        model: CashSession,
        as: "sessions",
        required: false,
      },
      { model: Recyclery, required: false },
    ],
    order: [[{ model: CashSession, as: "sessions" }, "createdAt", "DESC"]],
  });

  const sessions = register.sessions!;

  const lastSession = sessions.reduce<Date | null>((latest, session) => {
    const createdAt = session.createdAt;
    if (!latest || createdAt > latest) return createdAt;
    return latest;
  }, null);

  //TODO not clean ?
  res.json({
    success: true,
    data: {
      ...register.toJSON(),
      store_name: register.get("Recyclery")
        ? (register.get("Recyclery")?.get("name") ?? null)
        : null,
      total_sessions: sessions.length,
      last_session: lastSession,
    },
  });
};

export const createCaisse = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    name: z.string("Nom obligatoire"),
    store_id: z.coerce.number("magasin obligatoire"),
    is_active: z.coerce.boolean().optional().default(true),
  });
  const data = dataSchema.parse(req.body);

  // Vérifier que le magasin existe
  const store = await findByPkOrThrow(Recyclery, data.store_id, "Magasin non trouvé");

  //unique constraint unique name per store enforced in model
  const result = await store.createCaisse({
    name: data.name,
    is_active: data.is_active,
  });

  res.status(201).json({
    success: true,
    message: "Caisse créée avec succès",
    cash_register_id: result.id,
    data: result,
  });
};

export const updateCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const dataSchema = z.object({
    name: z.string("Nom obligatoire"),
    is_active: z.coerce.boolean().optional().default(true),
  });
  const data = dataSchema.parse(req.body);

  // Vérifier que la caisse existe
  const existingRegister = await findByPkOrThrow(
    CashRegister,
    id,
    "Caisse non trouvée",
  );
  await existingRegister.update({ ...data });

  res.json({
    success: true,
    message: "Caisse mise à jour avec succès",
    data: existingRegister,
  });
};

export const deleteCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  // Vérifier que la caisse existe
  const existingRegister = await findByPkOrThrow(
    CashRegister,
    id,
    "Caisse non trouvée",
  );

  await existingRegister.destroy();

  res.json({
    success: true,
    message: "Caisse supprimée avec succès",
  });
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCaissesMagasin = async (req: Request, res: Response) => {
  const { store_id } = req.params;
  req.query.store_id = store_id;
  logger.info("called list caisse magasin, REMAKE THIS ONE");
  listCaisses(req, res);
};
