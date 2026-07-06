import type { Request, Response } from "express";
import {
  collectionPointDataSchema,
  collectionPointFilterSchema,
} from "@recyclerie/api/schemas/collectionPoints";
import type {
  CollectionPointStatsResponse,
  CreateCollectionPointResponse,
  DeleteCollectionPointResponse,
  DetailCollectionPointResponse,
  ListCollectionPointsResponse,
  UpdateCollectionPointResponse,
} from "@recyclerie/api/responses/collectionPoints";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { toCollectionPointDto } from "../../mappers/collectionPoints.js";
import type { ModelWhere } from "../../models/db-types.js";
import db from "../../models/index.js";
import logger from "../../services/logger.js";

const { CollectionPoint, TaskSchedule, Recyclery } = db;

export const listCollectionPoints = async (req: Request, res: Response) => {
  const filter = collectionPointFilterSchema.parse(req.query);

  const where: ModelWhere<typeof CollectionPoint> = {};
  if (typeof filter.active_only == "boolean")
    where.is_active = filter.active_only;

  const collection_points = await CollectionPoint.findAll({
    where,
    include: [{ model: Recyclery }, { model: TaskSchedule }],
    order: [["name", "ASC"]],
  });

  res.json(
    apiData(collection_points.map(toCollectionPointDto)) satisfies ListCollectionPointsResponse,
  );
};

export const detailCollectionPoint = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const point = await findByPkOrThrow(
    CollectionPoint,
    id,
    "Point de collecte non trouvé",
    {
      include: [{ model: Recyclery }, { model: TaskSchedule }],
    },
  );

  res.json(
    apiData(toCollectionPointDto(point)) satisfies DetailCollectionPointResponse,
  );
};

export const createCollectionPoint = async (req: Request, res: Response) => {
  const data = collectionPointDataSchema.parse(req.body);

  const point = await CollectionPoint.create({
    ...data,
  });

  res.status(201).json(
    apiCreated(toCollectionPointDto(point), {
      message: "Point de collecte créé avec succès",
    }) satisfies CreateCollectionPointResponse,
  );
};

export const updateCollectionPoint = async (req: Request, res: Response) => {
  const data = collectionPointDataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);

  const point = await findByPkOrThrow(
    CollectionPoint,
    id,
    "Point de collecte non trouvé",
  );

  await db.sequelize.transaction(async (t) => {
    await point.update(
      {
        ...data,
      },
      { transaction: t },
    );

    await point.reload({ transaction: t });
  });

  res.json(
    apiData(toCollectionPointDto(point), {
      message: "Point de collecte mis à jour avec succès",
    }) satisfies UpdateCollectionPointResponse,
  );
};

export const deleteCollectionPoint = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const point = await findByPkOrThrow(
    CollectionPoint,
    id,
    "Point de collecte non trouvé",
  );
  await point.destroy();

  res.json(
    apiMessage("Point de collecte supprimé avec succès") satisfies DeleteCollectionPointResponse,
  );
};

/**
 * @deprecated
 */
export const stats = async (_req: Request, res: Response) => {
  logger.fatal("called stats collection points, REMAKE THIS ONE");
  res.json(
    apiData({
      total_collections: 0,
      completed_collections: 0,
      planned_collections: 0,
      cancelled_collections: 0,
    }) satisfies CollectionPointStatsResponse,
  );
};
