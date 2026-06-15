import type { Request, Response } from "express";
import createHttpError from "http-errors";
import z from "zod";
import { COLLECTION_POINT_TYPES } from "../../constants/dbEnums.js";
import { enumSchema, idSchema, phoneSchema, postalSchema } from "../../services/zod.js";
import type { ModelWhere } from "../../models/db-types.js";
import db from "../../models/index.js";

const { CollectionPoint, TaskSchedule, Recyclery } = db;

const dataSchema = z.object({
  name: z.string().trim().nonempty("nom requis"),
  address: z.string().trim().nonempty("addresse requis"),
  city: z.string().trim().nonempty("ville requis"),
  postal_code: postalSchema("code postal requis"),
  contact_person: z.string().nullish().prefault(null),
  contact_phone: phoneSchema().nullish().prefault(null),
  contact_email: z.email().nullish().prefault(null),
  type: enumSchema(COLLECTION_POINT_TYPES).optional().default("standard"),
  notes: z.string().nullish().prefault(null),
  recyclery_id: idSchema().nullish().prefault(null),
  is_active: z.coerce.boolean().optional().default(true),
});

export const listCollectionPoints = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["horaires"] as const;
  const filterSchema = z.object({
    active_only: z.coerce.boolean().optional(),
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  });
  const filter = filterSchema.parse(req.query);

  const where: ModelWhere<typeof CollectionPoint> = {};
  if (typeof filter.active_only == "boolean")
    where.is_active = filter.active_only;

  const collection_points = await CollectionPoint.findAll({
    where,
    include: [{ model: Recyclery }, { model: TaskSchedule }],
    order: [["name", "ASC"]],
  });

  res.json({
    success: true,
    collection_points,
  });
};

export const detailCollectionPoint = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const point = await CollectionPoint.findByPk(id, {
    include: [{ model: Recyclery }, { model: TaskSchedule }],
  });

  if (!point) throw new createHttpError[404]("Point de collecte non trouvé");

  res.json({
    success: true,
    collection_point: point,
  });
};

export const createCollectionPoint = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);

  const point = await CollectionPoint.create({
    ...data,
  });

  res.status(201).json({
    success: true,
    message: "Point de collecte créé avec succès",
    collection_point: point,
  });
};

export const updateCollectionPoint = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);

  const point = await CollectionPoint.findByPk(id, {});

  // Vérifier si le point existe
  if (!point) throw new createHttpError[404]("Point de collecte non trouvé");

  await db.sequelize.transaction(async (t) => {
    //presence updated in hook
    await point.update(
      {
        ...data,
      },
      { transaction: t },
    );

    await point.reload({ transaction: t });
  });

  res.json({
    success: true,
    message: "Point de collecte mis à jour avec succès",
    collection_point: point,
  });
};

export const deleteCollectionPoint = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const point = await CollectionPoint.findByPk(id);
  // Vérifier si le point existe
  if (!point) throw new createHttpError[404]("Point de collecte non trouvé");
  await point.destroy();

  res.json({
    success: true,
    message: "Point de collecte supprimé avec succès",
  });
};

/**
 * @deprecated
 */
export const stats = async (_req: Request, res: Response) => {
  // const { id } = req.params;

  // const stats = await CollectionSchedule.findOne({
  //   attributes: [
  //     [
  //       fn("COUNT", where(col("status"), "=", "completed")),
  //       "completed_collections",
  //     ],
  //     [
  //       fn("COUNT", where(col("status"), "=", "planned")),
  //       "planned_collections",
  //     ],
  //     [
  //       fn("COUNT", where(col("status"), "=", "cancelled")),
  //       "cancelled_collections",
  //     ],
  //     [fn("COUNT", col("*")), "total_collections"],
  //   ],
  //   where: {
  //     collection_point_id: id,
  //   },
  //   raw: true,
  // });

  res.json({
    success: true,
    stats: stats || {
      total_collections: 0,
      completed_collections: 0,
      planned_collections: 0,
      cancelled_collections: 0,
    },
  });
};
