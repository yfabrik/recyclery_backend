import { Router } from "express";
import db from "../../models/index.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import createHttpError from "http-errors";
import { Op } from "sequelize";

const { CashRegister, CashSession, Recyclery } = db;

export const router = Router();

// GET - Récupérer toutes les caisses
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { is_active } = req.query;
    const where = {};
    if (store_id) {
      where.store_id = store_id;
    }

    if (is_active !== undefined) {
      // Convert 'true'/'false' to boolean or 1/0
      where.is_active = is_active === "true" ? 1 : 0;
    }

    //TODO filter + COUNT sessions + last_session
    const cashRegister = await CashRegister.findAll({
      attributes: [
        "id",
        "name",
        "store_id",
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
      where,
      group: ["CashRegister.id", "Recyclery.name"],
      order: [
        ["recyclery_id", "ASC"],
        ["name", "ASC"],
      ],
    });

    res.json({
      success: true,
      data: cashRegister,
    });
  })
);

// GET - Récupérer une caisse par ID
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const register = await CashRegister.findByPk(id, {
      include: [
        { model: CashSession, as: "sessions" },
        { model: Recyclery, as: "recyclerie" },
      ],
    });

    if (!register) throw new createHttpError.NotFound("Caisse non trouvée");

    res.json({
      success: true,
      data: register,
    });
  })
);

// POST - Créer une nouvelle caisse
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { name, store_id, is_active = true } = req.body;

    // Validation
    if (!name || !store_id)
      throw new createHttpError.BadRequest(
        "Le nom et le magasin sont obligatoires"
      );

    // Vérifier que le magasin existe
    const store = await Recyclery.findByPk(store_id);
    if (!store) throw new createHttpError.NotFound("Magasin non trouvé");

    // Vérifier qu'une caisse avec ce nom n'existe pas déjà dans ce magasin
    const existingRegister = await CashRegister.findAll({
      where: { [Op.and]: [{ name: name }, { recyclery_id: store_id }] },
    });

    if (existingRegister)
      throw new createHttpError.Conflict(
        "Une caisse avec ce nom existe déjà dans ce magasin"
      );

    // Créer la caisse
    const result = await CashRegister.create({
      name,
      recyclery_id: store_id,
    });

    res.status(201).json({
      success: true,
      message: "Caisse créée avec succès",
      data: result,
    });
  })
);

// PUT - Mettre à jour une caisse
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
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
      where: { [Op.and]: [{ name: name }, { recyclery_id: store_id }] },
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
  })
);

// DELETE - Supprimer une caisse
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
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

    if (openSessions) {
      throw new createHttpError[400](
        "Impossible de supprimer une caisse avec des sessions ouvertes"
      );
    }

    await CashRegister.destroy(id);

    res.json({
      success: true,
      message: "Caisse supprimée avec succès",
    });
  })
);

// GET - Récupérer les caisses d'un magasin (pour le popup d'ouverture)
router.get(
  "/store/:store_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { store_id } = req.params;

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

    res.json({
      success: true,
      data: registers,
    });
  })
);
