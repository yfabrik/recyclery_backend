import { col, fn, Op, where } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import z from "zod";
import { asOptionalStringWithoutEmpty, idSchema, nullishToNull, phoneSchema, postalSchema } from "../../services/zod.js";

const { CollectionPoint, Recyclery, CollectionSchedule, TaskSchedule } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listCollectionPoints = async (req, res) => {
  const ALLOWED_INCLUDES = ["horaires"]
  const filterSchema = z.object({
    active_only: z.coerce.boolean().optional(),
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  })
  const filter = filterSchema.parse(req.query)
  /**
 * @type {import("sequelize").WhereOptions}
 */
  const where = {};
  if (typeof filter.active_only == "boolean") where.is_active = filter.active_only;

  // const include=[]
  // if (filter.include.includes("horaires"))
  //   include.push({
  //     model: TaskSchedule,
  //     as: "horaires",
  //     required: false
  //   })

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
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const detailCollectionPoint = async (req, res) => {
  const id = idSchema().parse(req.params.id);


  const point = await CollectionPoint.findByPk(id, {
    include: [{ model: Recyclery }, { model: TaskSchedule }],
  });

  if (!point) throw new createHttpError[404]("Point de collecte non trouvé")

  res.json({
    success: true,
    collection_point: point,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createCollectionPoint = async (req, res) => {
  const dataSchema = z.object({
    name: z.string("nom requis").trim().nonempty("nom requis"),
    address: z.string("addresse requis").trim().nonempty("addresse requis"),
    city: z.string("ville requis").trim().nonempty("ville requis"),
    postal_code: postalSchema("code postal requis"),
    contact_person: z.string().nullish(),
    contact_phone: phoneSchema().nullish(),//z.union([phoneSchema(),z.literal('')]).optional(),
    contact_email: z.email().nullish(),// z.union([z.email(), z.literal("")]).optional(),
    type: z.enum(["standard", "entreprise", "association", "school", "hospital", "other"]).nullish(),
    notes: z.string().nullish(),
    recyclery_id: idSchema().nullish()//.optional().nullable(),
  })
  const data = dataSchema.parse(req.body)

  const point = await CollectionPoint.create({
    ...data
  });

  res.status(201).json({
    success: true,
    message: "Point de collecte créé avec succès",
    collection_point: point,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const updateCollectionPoint = async (req, res) => {
  const dataSchema = z.object({
    name: z.string().trim().nonempty("nom requis"),
    address: z.string().trim().nonempty("addresse requis"),
    city: z.string().trim().nonempty("ville requis"),
    postal_code: postalSchema("code postal requis"),
    contact_person: z.string().nullish(),
    contact_phone: phoneSchema().nullish(),
    contact_email: z.email().nullish(),
    type: z.enum(["standard", "entreprise", "association", "school", "hospital", "other"]).nullish(),
    notes: z.string().nullish(),
    recyclery_id: idSchema().nullish(),
    is_active: z.coerce.boolean().optional().default(true),
  })
  const data = dataSchema.parse(req.body)
  const id = idSchema().parse(req.params.id)

  const point = await CollectionPoint.findByPk(id);
  // Vérifier si le point existe
  if (!point) throw new createHttpError[404]("Point de collecte non trouvé")
  // const existing = await CollectionPoint.findOne({
  //   where: { name, id: { [Op.ne]: id } },
  // });

  // // Vérifier si le nouveau nom n'est pas déjà utilisé

  // if (existing) {
  //   return res.status(400).json({
  //     success: false,
  //     error: "Un point de collecte avec ce nom existe déjà",
  //   });
  // }
  await point.update({
    ...data
  })


  res.json({
    success: true,
    message: "Point de collecte mis à jour avec succès",
    collection_point: point,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const deleteCollectionPoint = async (req, res) => {
  const id = idSchema().parse(req.params.id)
  const point = await CollectionPoint.findByPk(id);
  // Vérifier si le point existe
  if (!point) throw new createHttpError[404]("Point de collecte non trouvé")
  await point.destroy()

  // const scheduled = await point.getCollectionSchedules();
  // // Vérifier s'il y a des collectes programmées
  // if (scheduled.count > 0) {
  //   return res.status(400).json({
  //     success: false,
  //     error:
  //       "Impossible de supprimer un point de collecte qui a des collectes programmées",
  //   });
  // }
  // await CollectionPoint.destroy({ where: { id } });
  // Supprimer le point de collecte

  res.json({
    success: true,
    message: "Point de collecte supprimé avec succès",
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const stats = async (req, res) => {
  const { id } = req.params;

  const stats = await CollectionSchedule.findOne({
    attributes: [
      [
        fn("COUNT", where(col("status"), "=", "completed")),
        "completed_collections",
      ],
      [
        fn("COUNT", where(col("status"), "=", "planned")),
        "planned_collections",
      ],
      [
        fn("COUNT", where(col("status"), "=", "cancelled")),
        "cancelled_collections",
      ],
      [fn("COUNT", col("*")), "total_collections"],
    ],
    where: {
      collection_point_id: id,
    },
    raw: true,
  });

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
