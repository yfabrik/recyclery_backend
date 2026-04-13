import createHttpError from "http-errors";
import { col, fn, Op, type Attributes, type WhereOptions } from "sequelize";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import CashRegister from "../../models/cashregister.js";
import Recyclery from "../../models/recyclery.js";
import CashSession from "../../models/cashsession.js";

export const listCaisses = async (req: Request, res: Response) => {
  const store_id = idSchema().parse(req.params.id);

  const filterSchema = z.object({
    is_active: z.coerce.boolean().optional(),
    store_id: idSchema().optional(), //TODO fix NAME ?
  });

  const filter = filterSchema.parse({ store_id, ...req.query });

  const where: WhereOptions<Attributes<CashRegister>> = {};
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
    order: [
      // ["recyclery_id", "ASC"],
      ["name", "ASC"],
    ],
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

  const register = await CashRegister.findByPk(id, {
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

  if (!register) throw new createHttpError.NotFound("Caisse non trouvée");

  const sessions = register.sessions! //TODO better ?

  const lastSession = sessions.reduce<Date | null>((latest, session) => {
    const createdAt = session.createdAt;
    if (!latest || createdAt > latest) return createdAt;
    return latest;
  }, null);

  res.json({
    success: true,
    data: {
      ...register.toJSON(),
      store_name: register.get("Recyclery")
        ? (register.get("Recyclery") as Recyclery).get("name")
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
  const store = await Recyclery.findByPk(data.store_id);
  if (!store) throw new createHttpError.NotFound("Magasin non trouvé");

  // Vérifier qu'une caisse avec ce nom n'existe pas déjà dans ce magasin
  // const existingRegister = await CashRegister.findOne({
  //   where: { [Op.and]: [{ name: data.name }, { recyclery_id: data.store_id }] },
  // });

  // if (existingRegister)
  //   throw new createHttpError.Conflict(
  //     "Une caisse avec ce nom existe déjà dans ce magasin",
  //   );

  const result = await store.createCaisse({
    name:data.name,
    is_active:data.is_active
  })

  // Créer la caisse
  // const result = await CashRegister.create({
  //   name: data.name,
  //   is_active: data.is_active,
  //   recyclery_id: data.store_id,
  // });

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
  const existingRegister = await CashRegister.findByPk(id);

  if (!existingRegister) {
    throw new createHttpError.NotFound("Caisse non trouvée");
  }
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
  const existingRegister = await CashRegister.findByPk(id);

  if (!existingRegister) {
    throw new createHttpError.NotFound("Caisse non trouvée");
  }

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
export const listCaissesMagasin = async (req, res) => {
  const { store_id } = req.params;
  req.query.store_id = store_id;
  logger.info("called list caisse magasin, REMAKE THIS ONE");
  listCaisses(req, res);
};
