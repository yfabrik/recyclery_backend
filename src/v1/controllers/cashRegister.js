import db from  "../../models/index.js"

import createHttpError from "http-errors";
import { Op } from "sequelize";

const { CashRegister, CashSession, Recyclery, Sequelize } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listCaisses = async (req, res) => {
  const { is_active } = req.query;
  const store_id = req.query.store_id || req.params.id;

  const where = {};
  if (store_id) {
    where.recyclery_id = store_id;
  }

  if (is_active !== undefined) {
    // Convert 'true'/'false' to boolean or 1/0
    where.is_active = is_active === "true" ? 1 : 0;
  }

  //TODO filter + COUNT sessions + last_session
  const cashRegister = await CashRegister.findAll({
    attributes: {
      include:[
      [Sequelize.col("Recyclery.name"), "store_name"],
      [Sequelize.fn("COUNT", Sequelize.col("sessions.id")), "total_sessions"],
      [
        Sequelize.fn("MAX", Sequelize.col("sessions.createdAt")),
        "last_session",
      ],
    ]},
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
    cash_registers:cashRegister,
    registers:cashRegister
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const detailCaisse = async (req, res) => {
  const { id } = req.params;

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
  const { name, store_id, is_active = true } = req.body;
  console.log(name, store_id);

  // Validation
  if (!name || !store_id)
    throw new createHttpError.BadRequest(
      "Le nom et le magasin sont obligatoires"
    );

  // Vérifier que le magasin existe
  const store = await Recyclery.findByPk(store_id);
  if (!store) throw new createHttpError.NotFound("Magasin non trouvé");

  // Vérifier qu'une caisse avec ce nom n'existe pas déjà dans ce magasin
  const existingRegister = await CashRegister.findOne({
    where: { [Op.and]: [{ name: name }, { recyclery_id: store_id }] },
  });

  if (existingRegister)
    throw new createHttpError.Conflict(
      "Une caisse avec ce nom existe déjà dans ce magasin"
    );

  // Créer la caisse
  const result = await CashRegister.create({
    name:name,
    recyclery_id: store_id,
  });

  res.status(201).json({
    success: true,
    message: "Caisse créée avec succès",
    cash_register_id:result.id,
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
  const { name, is_active } = req.body;

  // Validation
  if (!name) {
    throw new createHttpError.BadRequest("Le nom est obligatoire");
  }

  // Vérifier que la caisse existe
  const existingRegister = await CashRegister.findByPk(id);

  if (!existingRegister) {
    throw new createHttpError.NotFound("Caisse non trouvée");
  }

  // Vérifier qu'une autre caisse avec ce nom n'existe pas dans le même magasin
  const duplicateRegister = await CashRegister.findAll({
    where: { [Op.and]: [{ name: name }, { recyclery_id: existingRegister.recyclery_id }] },
  });

  if (duplicateRegister) {
    throw new createHttpError.Conflict(
      "Une autre caisse avec ce nom existe déjà dans ce magasin"
    );
  }

  // Mettre à jour la caisse
  existingRegister.name = name;
  existingRegister.is_active = is_active;
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
  const openSessions = await CashSession.findAll({
    where: { [Op.and]: [{ cash_register_id: id }, { status: "open" }] },
  });

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
