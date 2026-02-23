import createHttpError from "http-errors";
import { col, fn, literal } from "sequelize";
import db from "../../models/index.js";
import z from "zod";
import { idSchema, nullishToNull } from "../../services/zod.js";

const { Donation, User } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listDons = async (req, res) => {
  const filterSchema = z.object({
    recyclery_id: idSchema().optional(),
    status: z.enum(["pending", "accepted", "rejected"]).optional(),
  });
  const filter = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = { ...filter };

  const donations = await Donation.findAll({
    where,
    attributes: {
      include: [
        [
          fn("COALESCE", col("donor_email"), col("donor_phone")),
          "donor_contact",
        ],
      ],
    },
    include: [{ model: User }],
    order: [["createdAt", "DESC"]],
  });

  res.json({ donations });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createDon = async (req, res) => {
  //TODO c'est au form de faire le tri et d'envoyer donor contact correctement
  // const donorContact = z.union([z.email(), z.string().regex(/^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/)]).optional().parse(req.body?.donor_contact)
  const dataSchema = z.object({
    donor_name: z.string("nom requis"),
    donor_contact: z.string().nullish(),
    item_description: z.string("description requis"),
    estimated_value: z.coerce
      .number()
      .nonnegative("valeur doit etre un nombre valide"),
  });
  const data = dataSchema.parse(req.body);

  //TODO make it better
  // Séparer email et téléphone du contact
  const isEmail = data.donor_contact && data.donor_contact.includes("@");
  const donor_email = isEmail ? data.donor_contact : null;
  const donor_phone = !isEmail ? data.donor_contact : null;

  const donation = await Donation.create({
    donor_name: data.donor_name,
    donor_phone,
    donor_email,
    item_description: data.item_description,
    estimated_value: data.estimated_value,
    // recyclery_id: 1, //FIXME
    received_by: req.user.id,
  });

  res.status(201).json({
    message: "Don enregistré avec succès",
    donation,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateDon = async (req, res) => {
  const { id } = req.params;
  const dataSchema = z.object({
    donor_name: z.string("nom requis"),
    donor_contact: z.string().nullish(),
    item_description: z.string("description requis"),
    estimated_value: z.coerce
      .number()
      .nonnegative("valeur doit etre un nombre valide"),
    status: z.enum(["pending", "accepted", "rejected"]).nullish(),
  });
  const data = dataSchema.parse(req.body);

  // Séparer email et téléphone du contact
  const isEmail = data.donor_contact && data.donor_contact.includes("@");
  const donor_email = isEmail ? data.donor_contact : null;
  const donor_phone = !isEmail ? data.donor_contact : null;

  const donation = await Donation.findByPk(id);
  if (!donation) throw new createHttpError.NotFound();

  donation.donor_name = data.donor_name;
  donation.donor_phone = donor_phone || null;
  donation.donor_email = donor_email || null;
  donation.item_description = data.item_description;
  donation.estimated_value = data.estimated_value;
  data.status && (donation.status = data.status);
  // donation.status = data.status;

  await donation.save();

  res.json({ message: "Don mis à jour avec succès" });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteDon = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const don = await Donation.findByPk(id);
  if (!don) throw new createHttpError.NotFound("don non trouvé");
  await don.destroy();
  return res.json({ success: true, message: "Don supprimé avec succès" });
};
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
        fn("SUM", literal(`CASE WHEN "status" = 'pending' THEN 1 ELSE 0 END`)),
        "pending_donations",
      ],
      [
        fn("SUM", literal(`CASE WHEN "status" = 'accepted' THEN 1 ELSE 0 END`)),
        "accepted_donations",
      ],
      [
        fn("SUM", literal(`CASE WHEN "status" = 'rejected' THEN 1 ELSE 0 END`)),
        "rejected_donations",
      ],
      [fn("SUM", col("estimated_value")), "total_estimated_value"],
    ],
    raw: true,
  });

  res.json({ stats });
};
