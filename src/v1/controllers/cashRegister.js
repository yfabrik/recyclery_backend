import db from "../../models/index.js"

import createHttpError from "http-errors";
import { Op } from "sequelize";
import * as z from "zod"
const { CashRegister, CashSession, Recyclery, Sequelize } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listCaisses = async (req, res) => {
  const filterSchema = z.object({
    is_active: z.coerce.boolean().optional(),
    store_id: z.coerce.number().positive().optional()
  })
  // const { is_active } = req.query;
  // const store_id = req.query.store_id || req.params.id;

  const filter = filterSchema.parse(req.query, req.params)
  /**
   * @type {import("sequelize").WhereOptions} 
   */
  const where = {};
  if (filter.store_id) {
    where.recyclery_id = filter.store_id;
  }

  if (filter.is_active !== undefined) {
    // Convert 'true'/'false' to boolean or 1/0
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
      ]
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
    registers: cashRegister
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const detailCaisse = async (req, res) => {
  const id = z.coerce.number().positive().parse(req.params.id);

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
    is_active: z.coerce.boolean().optional().default(true)
  })
  const data = dataSchema.parse(req.body)


  // Vérifier que le magasin existe
  const store = await Recyclery.findByPk(data.store_id);
  if (!store) throw new createHttpError.NotFound("Magasin non trouvé");

  // Vérifier qu'une caisse avec ce nom n'existe pas déjà dans ce magasin
  const existingRegister = await CashRegister.findOne({
    where: { [Op.and]: [{ name: data.name }, { recyclery_id: data.store_id }] },
  });

  if (existingRegister)
    throw new createHttpError.Conflict(
      "Une caisse avec ce nom existe déjà dans ce magasin"
    );

  // await store.createCaisse({
  //   name:data.name,
  //   is_active:data.is_active
  // })

  // // Créer la caisse
  const result = await CashRegister.create({
    name: data.name,
    is_active: data.is_active,
    recyclery_id: data.store_id
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
  const { id } = req.params;
  const dataSchema = z.object({
    name: z.string("Nom obligatoire"),
    is_active: z.coerce.boolean().optional().default(true)
  })
  const data = dataSchema.parse(req.body)


  // Vérifier que la caisse existe
  const existingRegister = await CashRegister.findByPk(id);

  if (!existingRegister) {
    throw new createHttpError.NotFound("Caisse non trouvée");
  }

  // Vérifier qu'une autre caisse avec ce nom n'existe pas dans le même magasin
  const duplicateRegister = await CashRegister.findAll({
    where: { [Op.and]: [{ name: data.name }, { recyclery_id: existingRegister.recyclery_id }] },
  });

  if (duplicateRegister) {
    throw new createHttpError.Conflict(
      "Une autre caisse avec ce nom existe déjà dans ce magasin"
    );
  }

  // Mettre à jour la caisse
  existingRegister.name = data.name;
  existingRegister.is_active = data.is_active;
  await existingRegister.save();

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
  const { id } = req.params;

  // Vérifier que la caisse existe
  const existingRegister = await CashRegister.findByPk(id);

  if (!existingRegister) {
    throw new createHttpError.NotFound("Caisse non trouvée");
  }

  // Vérifier qu'il n'y a pas de sessions ouvertes pour cette caisse
  const openSessions = await existingRegister.getSessions({ where: { status: "open" } })
  // console.log(open)
  // const openSessions = await CashSession.findAll({
  //   where: { [Op.and]: [{ cash_register_id: id }, { status: "open" }] },
  // });

  if (openSessions[0]) {
    throw new createHttpError[400](
      "Impossible de supprimer une caisse avec des sessions ouvertes"
    );
  }

  await CashRegister.destroy({ where: { id } });

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
  listCaisses(req, res);

  // const registers = await CashRegister.findAll({
  //     attributes: [
  //         "id",
  //         "name",
  //         "is_active",
  //         "created_at",
  //         [Sequelize.col("Recyclery.name"), "store_name"],
  //         // COUNT(cs.id) as total_sessions
  //         [
  //             Sequelize.fn("COUNT", Sequelize.col("CashSessions.id")),
  //             "total_sessions",
  //         ],
  //         // MAX(cs.opened_at) as last_session
  //         [
  //             Sequelize.fn("MAX", Sequelize.col("CashSessions.opened_at")),
  //             "last_session",
  //         ],
  //     ],
  //     include: [
  //         {
  //             model: Recyclery,
  //             attributes: [],
  //             required: false,
  //         },
  //         {
  //             model: CashSession,
  //             attributes: [],
  //             required: false,
  //         },
  //     ],
  //     where: { [Op.and]: [{ recyclery_id: store_id }, { is_active: true }] },
  // });

  // res.json({
  //     success: true,
  //     data: registers,
  // });
};
