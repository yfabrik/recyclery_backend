import createHttpError from "http-errors";
import { col, fn, literal } from "sequelize";
import db from  "../../models/index.js"



const { Donation, User } = db
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listDons = async (req, res) => {
  const { recyclery_id, status } = req.query;
    /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (recyclery_id) where.recyclery_id = recyclery_id;
  if (status) where.status = status;

  const donations = await Donation.findAll({
    where,
    attributes: {
      include:[
        [fn("COALESCE", col("donor_email"), col("donor_phone")), "donor_contact"],
      ]
    },
    include: [{ model: User }],
    order: [["createdAt", "DESC"]],
  });

  res.json({ donations });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createDon = async (req, res) => {
  const { donor_name, donor_contact, item_description, estimated_value } =
    req.body;

  if (!donor_name || !item_description) {
    return res
      .status(400)
      .json({ error: "Nom du donateur et description requis" });
  }

  // Validation du estimated_value (optionnel mais doit être numérique si fourni)
  if (
    estimated_value == undefined ||
    estimated_value == null ||
    estimated_value == "" 
    // isNaN(parseFloat(estimated_value))
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
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const updateDon = async (req, res) => {
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

  const donation = await Donation.findByPk(id);
  if (!donation) throw new createHttpError.NotFound();
  donation.donor_name = donor_name;
  donation.donor_phone = donor_phone;
  donation.donor_email = donor_email;
  donation.item_description = item_description;
  donation.estimated_value = estimated_value;
  donation.status = status;

  await donation.save();

  res.json({ message: "Don mis à jour avec succès" });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const donStats = async (req, res) => {
    const stats = await Donation.findOne({
      attributes: [
        [fn("COUNT", col("*")), "total_donations"],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN "status" = 'pending' THEN 1 ELSE 0 END`
            )
          ),
          "pending_donations",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN "status" = 'accepted' THEN 1 ELSE 0 END`
            )
          ),
          "accepted_donations",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN "status" = 'rejected' THEN 1 ELSE 0 END`
            )
          ),
          "rejected_donations",
        ],
        [fn("SUM", col("estimated_value")), "total_estimated_value"],
      ],
      raw: true,
    });

    res.json({ stats });
  }