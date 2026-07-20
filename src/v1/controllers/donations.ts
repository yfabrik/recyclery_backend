import { col, fn, literal } from "sequelize";
import {
  donationDataSchema,
  donationFilterSchema,
} from "@recyclerie/api/schemas/donations";
import type {
  CreateDonationResponse,
  DeleteDonationResponse,
  DonationStatsDto,
  DonationStatsResponse,
  ListDonationsResponse,
  UpdateDonationResponse,
} from "@recyclerie/api/responses/donations";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "@recyclerie/api/primitives/zod";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import { toDonationDto } from "../../mappers/donations.js";
import type { ModelWhere, RequestWithUser } from "./types.js";

const { Donation, User } = db;

export const listDons = async (req: Request, res: Response) => {
  const filter = donationFilterSchema.parse(req.query);
  const where: ModelWhere<typeof Donation> = { ...filter };

  const donations = await Donation.findAll({
    where,
    include: [{ model: User }],
    order: [["createdAt", "DESC"]],
  });

  res.json(
    apiData(donations.map(toDonationDto)) satisfies ListDonationsResponse,
  );
};

export const createDon = async (req: RequestWithUser, res: Response) => {
   //TODO c'est au form de faire le tri et d'envoyer donor contact correcteme
  const data = donationDataSchema.parse(req.body);

  const donation = await Donation.create({
    ...data,
    received_by: req.user.id,
  });

  res.status(201).json(
    apiCreated(toDonationDto(donation), {
      message: "Don enregistré avec succès",
    }) satisfies CreateDonationResponse,
  );
};

export const updateDon = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = donationDataSchema.parse(req.body);

  const donation = await findByPkOrThrow(Donation, id, "donation non trouvé");
  const { status, ...rest } = data;
  await donation.update({ ...rest, status: status ?? donation.status });

  res.json(
    apiMessage("Don mis à jour avec succès") satisfies UpdateDonationResponse,
  );
};

export const deleteDon = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const don = await findByPkOrThrow(Donation, id, "don non trouvé");
  await don.destroy();
  return res.json(
    apiMessage("Don supprimé avec succès") satisfies DeleteDonationResponse,
  );
};

export const donStats = async (_req: Request, res: Response) => {
  const stats = await Donation.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_donations"],
      [
        fn("SUM", literal(`CASE WHEN status = 'pending' THEN 1 ELSE 0 END`)),
        "pending_donations",
      ],
      [
        fn("SUM", literal(`CASE WHEN status = 'accepted' THEN 1 ELSE 0 END`)),
        "accepted_donations",
      ],
      [
        fn("SUM", literal(`CASE WHEN status = 'rejected' THEN 1 ELSE 0 END`)),
        "rejected_donations",
      ],
      [fn("SUM", col("estimated_value")), "total_estimated_value"],
    ],
    raw: true,
  });

  res.json(
    apiData((stats ?? null) as DonationStatsDto | null) satisfies DonationStatsResponse,
  );
};
