import type { Request, Response } from "express";
import { col, fn, literal, type Includeable } from "sequelize";
import {
  listWasteQuerySchema,
  wasteBodySchema,
  wasteDateRangeQuerySchema,
  wasteIdParamsSchema,
} from "@recyclerie/api/schemas/waste";
import type {
  CreateWasteResponse,
  DeleteWasteResponse,
  DetailWasteResponse,
  ListWasteResponse,
  UpdateWasteResponse,
  WasteStatsCategoryResponse,
  WasteStatsResponse,
} from "@recyclerie/api/responses/waste";
import {
  apiCreated,
  apiData,
  apiMessage,
  apiPaginated,
} from "@recyclerie/api/types/response";
import { formatWhereDateRange } from "../../helpers.js";
import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../services/pagination.js";

import db from "../../models/index.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { toWasteDto, toWasteStatsDto } from "../../mappers/waste.js";
import { type ModelWhere, type RequestWithUser } from "./types.js";

const { Category, EcoOrganism, User, WasteDisposal } = db;

const wasteIncludes:Includeable[] = [
  { model: Category, as: "category" },
  { model: Category, as: "subcategory" },
  { model: EcoOrganism, as: "eco_organism" },
  { model: User },
]   ;

export const listWaste = async (req: Request, res: Response) => {
  const filter = listWasteQuerySchema.parse(req.query);
  const pagination = parsePaginationQuery(req.query);

  const where: ModelWhere<typeof WasteDisposal> = {};
  if (filter.category_id) where.category_id = filter.category_id;
  if (filter.subcategory_id) where.subcategory_id = filter.subcategory_id;
  if (filter.eco_organism_id) where.eco_organism_id = filter.eco_organism_id;
  if (filter.disposal_type) where.disposal_type = filter.disposal_type;
  const dateRange = formatWhereDateRange(filter.date_from, filter.date_to);
  if (dateRange) where.disposal_date = dateRange;

  const waste = await WasteDisposal.findAndCountAll({
    where,
    include: wasteIncludes,
    order: [["disposal_date", "DESC"]],
    ...(pagination.paginated
      ? { limit: pagination.limit, offset: pagination.offset }
      : {}),
  });
  res.json(
    apiPaginated(
      waste.rows.map(toWasteDto),
      pagination.paginated
        ? buildPaginationMeta(pagination.page, pagination.perPage, waste.count)
        : buildUnpaginatedMeta(waste.count),
    ) satisfies ListWasteResponse,
  );
};

export const detailWaste = async (req: Request, res: Response) => {
  const { id } = wasteIdParamsSchema.parse(req.params);
  const waste = await findByPkOrThrow(
    WasteDisposal,
    id,
    "Sortie de déchets non trouvée",
    {
      include: wasteIncludes,
    },
  );

  res.json(apiData(toWasteDto(waste)) satisfies DetailWasteResponse);
};

export const createWaste = async (req: RequestWithUser, res: Response) => {
  const data = wasteBodySchema.parse(req.body);

  const waste = await WasteDisposal.create({
    ...data,
    created_by: req.user.id,
  });

  res.status(201).json(
    apiCreated(toWasteDto(waste), {
      message: "Sortie de déchets créée avec succès",
    }) satisfies CreateWasteResponse,
  );
};

export const updateWaste = async (req: Request, res: Response) => {
  const { id } = wasteIdParamsSchema.parse(req.params);
  const data = wasteBodySchema.parse(req.body);

  const waste = await findByPkOrThrow(
    WasteDisposal,
    id,
    "Sortie de déchets non trouvée",
  );
  await waste.update({ ...data });

  res.json(
    apiMessage("Sortie de déchets mise à jour avec succès") satisfies UpdateWasteResponse,
  );
};

export const deleteWaste = async (req: Request, res: Response) => {
  const { id } = wasteIdParamsSchema.parse(req.params);
  const toDelete = await findByPkOrThrow(
    WasteDisposal,
    id,
    "Sortie de déchets non trouvée",
  );
  await toDelete.destroy();

  res.json(
    apiMessage("Sortie de déchets supprimée avec succès") satisfies DeleteWasteResponse,
  );
};

export const wasteStats = async (req: Request, res: Response) => {
  const filter = wasteDateRangeQuerySchema.parse(req.query);

  const where: ModelWhere<typeof WasteDisposal> = {};
  const dateRange = formatWhereDateRange(filter.date_from, filter.date_to);
  if (dateRange) where.disposal_date = dateRange;

  const stats = await WasteDisposal.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_disposals"],
      [fn("SUM", col("weight_kg")), "total_weight_kg"],
      [fn("SUM", col("volume_m3")), "total_volume_m3"],
      [fn("SUM", col("transport_cost")), "total_transport_cost"],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"),
        ),
        "eco_organism_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"),
        ),
        "landfill_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"),
        ),
        "other_disposals",
      ],
    ],
    where,
  });

  res.json(
    apiData(
      toWasteStatsDto(
        (stats?.get({ plain: true }) ?? null) as Parameters<
          typeof toWasteStatsDto
        >[0],
      ),
    ) satisfies WasteStatsResponse,
  );
};

export const wasteStatsCategory = async (req: Request, res: Response) => {
  const { date_from, date_to } = wasteDateRangeQuerySchema.parse(req.query);

  const where: ModelWhere<typeof WasteDisposal> = {};
  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.disposal_date = dateRange;

  const stats = await WasteDisposal.findAll({
    attributes: [
      [fn("COUNT", col("*")), "total_disposals"],
      [fn("SUM", col("weight_kg")), "total_weight_kg"],
      [fn("SUM", col("volume_m3")), "total_volume_m3"],
      [fn("SUM", col("transport_cost")), "total_transport_cost"],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"),
        ),
        "eco_organism_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"),
        ),
        "landfill_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"),
        ),
        "other_disposals",
      ],
    ],
    where,
    include: [{ model: Category, as: "categorie" }],
    order: [["total_weight_kg", "DESC"]],
    group: ["id", "categorie.name"],
  });

  res.json(
    apiData(
      stats.map((row) =>
        toWasteStatsDto(
          row.get({ plain: true }) as NonNullable<
            Parameters<typeof toWasteStatsDto>[0]
          >,
        )!,
      ),
    ) satisfies WasteStatsCategoryResponse,
  );
};
