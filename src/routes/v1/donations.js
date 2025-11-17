import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import { fn } from "sequelize";

const { Donation, Sequelize } = db;
export const router = Router();
// Obtenir tous les dons/apports
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { recyclery_id, status } = req.query;
    const where = {};
    if (recyclery_id) where.recyclery_id = recyclery_id;
    if (status) where.status = status;

    const donations = await Donation.finAll({
      where,
      attributes: [
        "*",
        Sequelize.fn(
          " COALESCE(d.donor_email, d.donor_phone) as donor_contact"
        ),
      ],
      include: [{ model: User }],
      order: ["createdAt", "DESC"],
    });

    res.json({ donations });
  })
);

// Créer un nouveau don
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { donor_name, donor_contact, item_description, estimated_value } =
      req.body;

    if (!donor_name || !item_description) {
      return res
        .status(400)
        .json({ error: "Nom du donateur et description requis" });
    }

    // Validation du estimated_value (optionnel mais doit être numérique si fourni)
    if (
      estimated_value !== undefined &&
      estimated_value !== null &&
      estimated_value !== "" &&
      isNaN(parseFloat(estimated_value))
    ) {
      return res
        .status(400)
        .json({ error: "La valeur estimée doit être un nombre valide" });
    }

    // Séparer email et téléphone du contact
    const isEmail = donor_contact && donor_contact.includes("@");
    const donor_email = isEmail ? donor_contact : null;
    const donor_phone = !isEmail ? donor_contact : null;

    const donation = await Donation.create({
      donor_name,
      donor_phone,
      donor_email,
      item_description,
      estimated_value,
      recyclery_id: 1, //FIXME
      received_by: req.user.id,
    });

    res.status(201).json({
      message: "Don enregistré avec succès",
      donation,
    });
  })
);

// PUT update donation
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      donor_name,
      donor_contact,
      item_description,
      estimated_value,
      status,
    } = req.body;

    if (!donor_name || !item_description) {
      return res
        .status(400)
        .json({ error: "Nom du donateur et description requis" });
    }

    // Séparer email et téléphone du contact
    const isEmail = donor_contact && donor_contact.includes("@");
    const donor_email = isEmail ? donor_contact : null;
    const donor_phone = !isEmail ? donor_contact : null;

    const donation = Donation.findByPk(id);
    if (!donation) throw new createHttpError.NotFound();
    donation.donor_name ??= donor_name;
    donation.donor_phone ??= donor_phone;
    donation.donor_email ??= donor_email;
    donation.item_description ??= item_description;
    donation.estimated_value ??= estimated_value;
    donation.stats ??= status;

    await donation.save();

    res.json({ message: "Don mis à jour avec succès" });
  })
);

// GET donation statistics
router.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await Donation.findOne({
      attributes: [
        [fn("COUNT", col("*")), "total_donations"][
          (fn("SUM", where(col("status"), "=", "pending")), "pending_donations")
        ],
        [
          fn("SUM", where(col("status"), "=", "accepted")),
          "accepted_donations",
        ],
        [
          fn("SUM", where(col("status"), "=", "rejected")),
          "rejected_donations",
        ],
        [fn("SUM", col("estimated_value")), "total_estimated_value"],
      ],
      raw: true,
    });

    res.json({ stats });
  })
);
