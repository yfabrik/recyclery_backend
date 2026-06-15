import createHttpError from "http-errors";
import { col, fn, literal } from "sequelize";
import z from "zod";
import { DONATION_STATUSES } from "../../constants/dbEnums.js";
import { enumSchema, idSchema, phoneSchema } from "../../services/zod.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere, RequestWithUser } from "./types.js";

const { Donation, User } = db;

const dataSchema = z.object({
  donor_name: z.string("nom requis"),
  donor_email: z.email().nullish().prefault(null),
  donor_phone: phoneSchema().nullish().prefault(null),
  // donor_contact: z.string().nullish(),
  item_description: z.string("description requis"),
  estimated_value: z.coerce
    .number()
    .nonnegative("valeur doit etre un nombre valide"),
  weight: z.coerce.number().nonnegative("poids requis"),
  status: enumSchema(DONATION_STATUSES).optional(),
});

export const listDons = async (req: Request, res: Response) => {
  const filterSchema = z.object({
    recyclery_id: idSchema().optional(),
    status: enumSchema(DONATION_STATUSES).optional(),
  });
  const filter = filterSchema.parse(req.query);

  const where: ModelWhere<typeof Donation> = { ...filter };

  const donations = await Donation.findAll({
    where,
    // attributes: {
    //   include: [
    //     [
    //       fn("COALESCE", col("donor_email"), col("donor_phone")),
    //       "donor_contact",
    //     ],
    //   ],
    // },
    include: [{ model: User }],
    order: [["createdAt", "DESC"]],
  });

  res.json({ donations });
};

export const createDon = async (req: RequestWithUser, res: Response) => {
  //TODO c'est au form de faire le tri et d'envoyer donor contact correctement
  // const donorContact = z.union([z.email(), z.string().regex(/^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/)]).optional().parse(req.body?.donor_contact)

  const data = dataSchema.parse(req.body);

  //TODO make it better
  // Séparer email et téléphone du contact
  // const isEmail = data.donor_contact && data.donor_contact.includes("@");
  // const donor_email = isEmail ? data.donor_contact : null;
  // const donor_phone = !isEmail ? data.donor_contact : null;

  const donation = await Donation.create({
    ...data,
    received_by: req.user.id,
  });

  res.status(201).json({
    message: "Don enregistré avec succès",
    donation,
  });
};

export const updateDon = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  // Séparer email et téléphone du contact
  // const isEmail = data.donor_contact && data.donor_contact.includes("@");
  // const donor_email = isEmail ? data.donor_contact : null;
  // const donor_phone = !isEmail ? data.donor_contact : null;

  const donation = await Donation.findByPk(id);
  if (!donation) throw new createHttpError.NotFound("donation non trouvé");

  // donation.donor_name = data.donor_name;
  // donation.donor_phone = donor_phone || null;
  // donation.donor_email = donor_email || null;
  // donation.item_description = data.item_description;
  // donation.estimated_value = data.estimated_value;
  const { status, ...rest } = data;

  // data.status && (donation.status = data.status);
  // donation.status = data.status;
  await donation.update({ ...rest, status: status ?? donation.status });
  // await donation.save();

  res.json({ message: "Don mis à jour avec succès" });
};

export const deleteDon = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const don = await Donation.findByPk(id);
  if (!don) throw new createHttpError.NotFound("don non trouvé");
  await don.destroy();
  return res.json({ success: true, message: "Don supprimé avec succès" });
};

export const donStats = async (_req: Request, res: Response) => {
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
