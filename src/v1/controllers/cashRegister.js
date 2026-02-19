import db from "../../models/index.js";

import createHttpError from "http-errors";
import { Op } from "sequelize";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
const { CashRegister, CashSession, Recyclery, Sequelize } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCaisses = async (req, res) => {
  const { id: store_id } = req.params || {};
  const filterSchema = z.object({
    is_active: z.coerce.boolean().optional(),
    store_id: idSchema().optional(), //TODO fix NAME ?
  });

  const filter = filterSchema.parse({ store_id, ...req.query });
  /**
   * @type {import("sequelize").WhereOptions<import("../../models/types/cashRegisterModel.js").CashRegisterAttributes>}
   */
  const where = {};
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
        [Sequelize.col("Recyclery.name"), "store_name"],
        [Sequelize.fn("COUNT", Sequelize.col("sessions.id")), "total_sessions"],
        [
          Sequelize.fn("MAX", Sequelize.col("sessions.createdAt")),
          "last_session",
        ],
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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailCaisse = async (req, res) => {
  const id = idSchema().parse(req.params.id);

  const register = await CashRegister.findByPk(id, {
    attributes: [
      [Sequelize.col("Recyclery.name"), "store_name"],
      [Sequelize.fn("COUNT", Sequelize.col("sessions.id")), "total_sessions"],
      [
        Sequelize.fn("MAX", Sequelize.col("sessions.createdAt")),
        "last_session",
      ],
    ],
    include: [{ model: CashSession, as: "sessions" }, { model: Recyclery }],
  });

  if (!register) throw new createHttpError.NotFound("Caisse non trouvée");

  res.json({
    success: true,
    data: register,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createCaisse = async (req, res) => {
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
  const existingRegister = await CashRegister.findOne({
    where: { [Op.and]: [{ name: data.name }, { recyclery_id: data.store_id }] },
  });

  if (existingRegister)
    throw new createHttpError.Conflict(
      "Une caisse avec ce nom existe déjà dans ce magasin",
    );

  // const result = await store.createCaisse({
  //   name:data.name,
  //   is_active:data.is_active
  // })

  // Créer la caisse
  const result = await CashRegister.create({
    name: data.name,
    is_active: data.is_active,
    recyclery_id: data.store_id,
  });

  res.status(201).json({
    success: true,
    message: "Caisse créée avec succès",
    cash_register_id: result.id,
    data: result,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateCaisse = async (req, res) => {
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
  //TODO check on the model

  // Vérifier qu'une autre caisse avec ce nom n'existe pas dans le même magasin
  const duplicateRegister = await CashRegister.findAll({
    where: {
      [Op.and]: [
        { name: data.name },
        { recyclery_id: existingRegister.recyclery_id },
        { id: { [Op.ne]: id } }, // Exclude current record
      ],
    },
  });

  if (duplicateRegister.length > 0) {
    throw new createHttpError.Conflict(
      "Une autre caisse avec ce nom existe déjà dans ce magasin",
    );
  }
  await existingRegister.update({ ...data });

  res.json({
    success: true,
    message: "Caisse mise à jour avec succès",
    data: existingRegister,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteCaisse = async (req, res) => {
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
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCaissesMagasin = async (req, res) => {
  const { store_id } = req.params;
  req.query.store_id = store_id;
  logger.info("called list caisse magasin, REMAKE THIS ONE");
  listCaisses(req, res);
};
