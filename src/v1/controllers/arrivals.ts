import type { Request, Response } from "express";
import createHttpError from "http-errors";
import {
  col,
  fn,
  literal,
} from "sequelize";
import * as z from "zod";

import { formatWhereDateRange } from "../../helpers.js";
import { idSchema } from "../../services/zod.js";
import type { ModelWhere, RequestWithUser } from "./types.ts";

import db from "../../models/index.js";

const { Arrival, Category, CollectionPoint, User } = db;

const dataSchema = z
  .object({
    category_id: idSchema("catégorie requis"),
    subcategory_id: idSchema().nullish().prefault(null),
    weight: z.coerce.number().positive("poids requis"),
    arrival_date: z.coerce.date("date d'arrivage requis"),
    arrival_time: z.coerce
      .date(" date d'arrivage requis")
      .transform((val) =>
        val.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
    source_type: z.enum(["point", "apport", "house_clearance"]),
    source_details: z.string().nullish().prefault(null),
    collection_point_id: idSchema().nullish().prefault(null),
    collection_point_name: z.string().nullish().prefault(null),
    collection_point_address: z.string().nullish().prefault(null),
    notes: z.string().nullish().prefault(null),
  })
  .superRefine((obj, ctx) => {
    if (obj.source_type == "point" && !obj.collection_point_id)
      ctx.addIssue({
        code: "custom",
        origin: "collection_point_id",
        message: "si source = point,collection point requis",
        input: obj,
      });
  });

const filterSchema = z.object({
  category_id: idSchema().optional(),
  source_type: z.enum(["point", "apport", "house_clearance"]).optional(),
  status: z.enum(["received"]).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().positive().optional(),
});

export const listArrivals = async (req: Request, res: Response) => {
  const { date_from, date_to, page, ...rest } = filterSchema.parse(req.query);

  const where: ModelWhere<typeof Arrival> = { ...rest };
  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.arrival_date = dateRange;

  const pagination = {} as { limit: number; offset: number };
  if (page) {
    pagination.limit = 50;
    pagination.offset = (page - 1) * pagination.limit;
  }

  const arrivals = await Arrival.findAndCountAll({
    where,
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint },
    ],
    order: [["createdAt", "DESC"]],
    ...pagination,
  });

  res.json({
    success: true,
    arrivals: arrivals.rows,
    pagination: {
      page: page || 1,
      limit: pagination.limit,
      total: arrivals.count,
      totalPages: Math.ceil(arrivals.count / pagination.limit),
    },
  });
};

export const detailArrival = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const arrival = await Arrival.findByPk(id, {
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint },
    ],
  });
  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé");
  res.json({
    success: true,
    arrival: arrival,
  });
};

export const createArrival = async (
  req: RequestWithUser,
  res: Response,
) => {
  const data = dataSchema.parse(req.body);
  const category = await Category.findByPk(data.subcategory_id ?? data.category_id); //TODO filter par type de category need only IO.in ?
  // Vérifier si la catégorie existe
  if (!category) throw new createHttpError[404]("Catégorie non trouvée");

  const arrival = await Arrival.create({
    ...data,
    // category_id: category.id,
    processed_by: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Arrivage créé avec succès",
    arrival,
  });
};

export const updateArrival = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);

  const arrival = await Arrival.findByPk(id);
  // Vérifier si l'arrivage existe

  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé");
  await arrival.update({
    ...data,
    // category_id: data.subcategory_id ?? data.category_id,
  });

  res.json({
    success: true,
    message: "Arrivage mis à jour avec succès",
  });
};

export const deleteArrival = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const arrival = await Arrival.destroy({ where: { id } });
  // Vérifier si l'arrivage existe
  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé");
  res.json({
    success: true,
    message: "Arrivage supprimé avec succès",
  });
};

export const statsSummary = async (
  req: RequestWithUser,
  res: Response,
) => {
  const filterSchema = z.object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  });

  const data = filterSchema.parse(req.query);

  const where: ModelWhere<typeof Arrival> = {};
  const dateRange = formatWhereDateRange(data.date_from, data.date_to);
  if (dateRange) where.arrival_date = dateRange;

  const stats = await Arrival.findOne({
    attributes: [
      // COUNT(*)
      [fn("COUNT", col("*")), "total_arrivals"],

      // SUM(weight)
      [fn("SUM", col("weight")), "total_weight"],

      // COUNT(CASE WHEN source_type = 'collection_point')
      [
        fn(
          "COUNT",
          literal("CASE WHEN source_type = 'collection_point' THEN 1 END"),
        ),
        "from_collection_points",
      ],

      // volunteer_donation = 1
      [
        fn("COUNT", literal("CASE WHEN volunteer_donation = 1 THEN 1 END")),
        "volunteer_donations",
      ],

      // house_clearance = 1
      [
        fn("COUNT", literal("CASE WHEN house_clearance = 1 THEN 1 END")),
        "house_clearances",
      ],

      // status = 'received'
      [
        fn("COUNT", literal("CASE WHEN status = 'received' THEN 1 END")),
        "pending_processing",
      ],

      // status = 'processed'
      [
        fn("COUNT", literal("CASE WHEN status = 'processed' THEN 1 END")),
        "processed",
      ],
    ],

    where,
    raw: true,
  });

  res.json({
    success: true,
    stats: stats || {
      total_arrivals: 0,
      total_weight: 0,
      from_collection_points: 0,
      volunteer_donations: 0,
      house_clearances: 0,
      pending_processing: 0,
      processed: 0,
    },
  });
};

export const statsByCategories = async (req: Request, res: Response) => {
  const filterSchema = z.object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  });

  const data = filterSchema.parse(req.query);

  const where: ModelWhere<typeof Arrival> = {};
  const dateRange = formatWhereDateRange(data.date_from, data.date_to);
  if (dateRange) where.arrival_date = dateRange;

  const stats = await Arrival.findAll({
    attributes: {
      include: [
        [fn("COUNT", col("*")), "count"],
        [fn("SUM", col("weight")), "total_weight"],
      ],
    },
    include: [{ model: Category, as: "categorie" }],
  });

  res.json({
    success: true,
    categories: stats || [],
  });
};
