import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { col, fn, literal } from "sequelize";
import {
  arrivalDataSchema,
  arrivalDateFilterSchema,
  arrivalFilterSchema,
  type ArrivalData,
} from "@recyclerie/api/schemas/arrivals";
import type {
  ArrivalCategoryStatsResponse,
  ArrivalStatsResponse,
  CreateArrivalResponse,
  DeleteArrivalResponse,
  DetailArrivalResponse,
  ListArrivalsResponse,
  UpdateArrivalResponse,
} from "@recyclerie/api/responses/arrivals";
import {
  apiCreated,
  apiData,
  apiMessage,
  apiPaginated,
} from "@recyclerie/api/types/response";
import { idSchema } from "@recyclerie/api/primitives/zod";

import { formatWhereDateRange } from "../../helpers.js";
import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../services/pagination.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { IOValues } from "../../constants/categoryIO.js";
import {
  toArrivalCategoryStatsDto,
  toArrivalDto,
  toArrivalStatsDto,
  type ArrivalCategoryStatsRow,
  type ArrivalStatsRow,
} from "../../mappers/arrivals.js";
import type { ModelWhere, RequestWithUser } from "./types.ts";

import db from "../../models/index.js";
import logger from "../../services/logger.js";

const { Arrival, Category, CollectionPoint, User } = db;

export const listArrivals = async (req: Request, res: Response) => {
  const { date_from, date_to, ...rest } = arrivalFilterSchema.parse(req.query);
  const pagination = parsePaginationQuery(req.query);

  const where: ModelWhere<typeof Arrival> = { ...rest };
  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.arrival_date = dateRange;

  const whereCollectionPoint: ModelWhere<typeof CollectionPoint> = {};
  if (rest.collection_point_id && rest.source_type == "point") {
    whereCollectionPoint.id = rest.collection_point_id;
  }

  const arrivals = await Arrival.findAndCountAll({
    where,
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint, where: whereCollectionPoint, required: false },
    ],
    order: [["createdAt", "DESC"]],
    ...(pagination.paginated
      ? { limit: pagination.limit, offset: pagination.offset }
      : {}),
  });

  res.json(
    apiPaginated(
      arrivals.rows.map(toArrivalDto),
      pagination.paginated
        ? buildPaginationMeta(pagination.page, pagination.perPage, arrivals.count)
        : buildUnpaginatedMeta(arrivals.count),
    ) satisfies ListArrivalsResponse,
  );
};

export const detailArrival = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const arrival = await findByPkOrThrow(Arrival, id, "Arrivage non trouvé", {
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint },
    ],
  });
  res.json(
    apiData(toArrivalDto(arrival)) satisfies DetailArrivalResponse,
  );
};

const normalizeArrivalPayload = async (data: ArrivalData) => {
  const category = await findByPkOrThrow(
    Category,
    data.category_id,
    "Catégorie non trouvée",
    {
      include: [
        {
          model: Category,
          as: "subcategories",
          required: false,
          where: { IO: literal(`subcategories.IO & ${IOValues.IN} != 0`) },
        },
      ],
    },
  );
  if((category.IO &IOValues.IN) == 0) {
    throw new createHttpError.BadRequest(
      "Catégorie non trouvée",
    );
  }
  const subCount = category.subcategories?.length ?? 0;
  if (subCount > 0 && !data.subcategory_id) {
    throw new createHttpError.BadRequest(
      "sous-catégorie requise pour cette catégorie",
    );
  }
  if (data.subcategory_id) {
    const subCategory = category.subcategories?.find((sub) => sub.id === data.subcategory_id);
    if (!subCategory) {
      throw new createHttpError.BadRequest(
        "Sous-catégorie non trouvée",
      );
    }
  }

  if (data.source_type === "point") {
    await findByPkOrThrow(
      CollectionPoint,
      data.collection_point_id!,
      "Point de collecte non trouvé",
    );
    return data;
  }

  return {
    ...data,
    collection_point_id: null,
    collection_point_name: null,//TODO needed ??
    collection_point_address: null,//TODO needed ??
  };
};

export const createArrival = async (req: RequestWithUser, res: Response) => {
  const data = await normalizeArrivalPayload(arrivalDataSchema.parse(req.body));
  const arrival = await Arrival.create({
    ...data,
    processed_by: req.user.id,
  });
  logger.info(
    `new arrival ${arrival.id}:${arrival.weight}kg, ${arrival.source_type},by ${req.user.username}`,
  );
  res.status(201).json(
    apiCreated(toArrivalDto(arrival), {
      message: "Arrivage créé avec succès",
    }) satisfies CreateArrivalResponse,
  );
};

export const updateArrival = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = await normalizeArrivalPayload(arrivalDataSchema.parse(req.body));

  const arrival = await findByPkOrThrow(Arrival, id, "Arrivage non trouvé");
  await arrival.update({
    ...data,
  });

  res.json(
    apiMessage("Arrivage mis à jour avec succès") satisfies UpdateArrivalResponse,
  );
};

export const deleteArrival = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const arrival = await findByPkOrThrow(Arrival, id, "Arrivage non trouvé");
  await arrival.destroy();
  res.json(
    apiMessage("Arrivage supprimé avec succès") satisfies DeleteArrivalResponse,
  );
};

export const statsSummary = async (req: RequestWithUser, res: Response) => {
  const data = arrivalDateFilterSchema.parse(req.query);

  const where: ModelWhere<typeof Arrival> = {};
  const dateRange = formatWhereDateRange(data.date_from, data.date_to);
  if (dateRange) where.arrival_date = dateRange;

  const stats = await Arrival.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_arrivals"],
      [fn("SUM", col("weight")), "total_weight"],
      [
        fn(
          "COUNT",
          literal("CASE WHEN source_type = 'collection_point' THEN 1 END"),
        ),
        "from_collection_points",
      ],
      [
        fn("COUNT", literal("CASE WHEN volunteer_donation = 1 THEN 1 END")),
        "volunteer_donations",
      ],
      [
        fn("COUNT", literal("CASE WHEN house_clearance = 1 THEN 1 END")),
        "house_clearances",
      ],
      [
        fn("COUNT", literal("CASE WHEN status = 'received' THEN 1 END")),
        "pending_processing",
      ],
      [
        fn("COUNT", literal("CASE WHEN status = 'processed' THEN 1 END")),
        "processed",
      ],
    ],
    where,
    raw: true,
  });

  res.json(
    apiData(toArrivalStatsDto(stats as ArrivalStatsRow | null)) satisfies ArrivalStatsResponse,
  );
};

export const statsByCategories = async (req: Request, res: Response) => {
  const data = arrivalDateFilterSchema.parse(req.query);

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

  res.json(
    apiData(
      stats.map((row) => toArrivalCategoryStatsDto(row as ArrivalCategoryStatsRow)),
    ) satisfies ArrivalCategoryStatsResponse,
  );
};
