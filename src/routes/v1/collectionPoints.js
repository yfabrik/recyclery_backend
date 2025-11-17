import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { fn, Op } from "sequelize";

const { CollectionPoint, Recyclery, Collectionschedule } = db;
export const router = Router();

// Obtenir tous les points de collecte
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { active_only } = req.query;
    const where = {};
    if (active_only === "true") where.is_active = 1;

    const collection_points = await CollectionPoint.findAll({
      where,
      include: [{ model: Recyclery }],
      order: ["name"],
    });

    res.json({
      success: true,
      collection_points,
    });
  })
);

// Obtenir un point de collecte spécifique
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const point = await CollectionPoint.findByPk(id, {
      include: [{ model: Recyclery }],
    });

    if (!point) {
      return res.status(404).json({
        success: false,
        error: "Point de collecte non trouvé",
      });
    }

    res.json({
      success: true,
      collection_point: point,
    });
  })
);

// Créer un nouveau point de collecte
router.post(
  "/",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const {
      name,
      address,
      city,
      postal_code,
      contact_person,
      contact_phone,
      contact_email,
      type,
      notes,
      recyclery_id,
    } = req.body;

    // Validation
    if (!name || !address || !city || !postal_code) {
      return res.status(400).json({
        success: false,
        error: "Le nom, l'adresse, la ville et le code postal sont requis",
      });
    }

    // Vérifier si un point avec le même nom existe déjà
    const existing = await CollectionPoint.findOne({ where: { name } });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Un point de collecte avec ce nom existe déjà",
      });
    }
    const point = await CollectionPoint.create({
      name,
      address,
      city,
      postal_code,
      contact_person,
      contact_phone,
      contact_email,
      type,
      notes,
      recyclery_id,
    });

    res.status(201).json({
      success: true,
      message: "Point de collecte créé avec succès",
      collection_point: point,
    });
  })
);

// Mettre à jour un point de collecte
router.put(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      postal_code,
      contact_person,
      contact_phone,
      contact_email,
      type,
      notes,
      is_active,
      recyclery_id,
    } = req.body;

    // Validation
    if (!name || !address || !city || !postal_code) {
      return res.status(400).json({
        success: false,
        error: "Le nom, l'adresse, la ville et le code postal sont requis",
      });
    }

    const point = CollectionPoint.findByPk(id);
    // Vérifier si le point existe

    if (!point) {
      return res.status(404).json({
        success: false,
        error: "Point de collecte non trouvé",
      });
    }
    const existing = await CollectionPoint.findOne({
      where: { name, id: { [Op.ne]: id } },
    });

    // Vérifier si le nouveau nom n'est pas déjà utilisé

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Un point de collecte avec ce nom existe déjà",
      });
    }
    point.name ??= name;
    point.address ??= address;
    point.city ??= city;
    point.postal_code ??= postal_code;
    point.contact_person ??= contact_person;
    point.contact_phone ??= contact_phone;
    point.contact_email ??= contact_email;
    point.type ??= type;
    point.is_active ??= is_active;
    point.recyclery_id ??= recyclery_id;
    await point.save();

    res.json({
      success: true,
      message: "Point de collecte mis à jour avec succès",
      collection_point: point,
    });
  })
);

// Supprimer un point de collecte
router.delete(
  "/:id",
  authenticateToken,
  //  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const point = await CollectionPoint.findByPk(id);
    // Vérifier si le point existe
    if (!point) {
      return res.status(404).json({
        success: false,
        error: "Point de collecte non trouvé",
      });
    }

    const scheduled = await point.getCollectionSchedules();
    // Vérifier s'il y a des collectes programmées
    if (scheduled.count > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Impossible de supprimer un point de collecte qui a des collectes programmées",
      });
    }
    await CollectionPoint.destroy({ where: { id } });
    // Supprimer le point de collecte

    res.json({
      success: true,
      message: "Point de collecte supprimé avec succès",
    });
  })
);

// Obtenir les statistiques d'un point de collecte
router.get(
  "/:id/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stats = await Collectionschedule.findOne({
      attributes: [
        [
          fn("COUNT", where(col("status"), "=", "completed")),
          "completed_collections",
        ],
        [
          fn("COUNT", where(col("status"), "=", "planned")),
          "planned_collections",
        ],
        [
          fn("COUNT", where(col("status"), "=", "cancelled")),
          "cancelled_collections",
        ],
        [fn("COUNT", col("*")), "total_collections"],
      ],
      where: {
        collection_point_id: id,
      },
      raw: true,
    });

    res.json({
      success: true,
      stats: stats || {
        total_collections: 0,
        completed_collections: 0,
        planned_collections: 0,
        cancelled_collections: 0,
      },
    });
  })
);
