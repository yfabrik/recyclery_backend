import createHttpError from "http-errors";
import * as z from "zod";
import db from "../../models/index.js";
import { idSchema } from "../../services/zod.js";
import { detailTask } from "./tasks.js";
import { deleteSchedule, listSchedules } from "./taskSchedule.js";

/**
 * 
 * @param {string} day 
 * @returns {Date}
 */
const getDateFromDay = (day) => {
  const today = new Date();
  let d;
  let i = 0;
  while (i < 7) {
    const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
      today.setDate(today.getDate() + 1),
    );
    if (jour == day.toLowerCase()) {
      d = today;
      break;
    }
    i++;
  }
  if (!d) throw new createHttpError[400]();
  return d;
};

const dataSchema = z.object({
  collection_point_id: idSchema(
    "ID du point de collecte et jour de la semaine sont obligatoires",
  ),
  store_id: idSchema().nullish(),
  day_of_week: z
    .enum([
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ])
    .transform((val) => getDateFromDay(val)),
  is_open: z.coerce.boolean().default(true),
  start_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date(new Date().setHours(+hours, +min));
    }),
    z.coerce.date(),
  ]),
  end_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date(new Date().setHours(+hours, +min));
    }),
    z.coerce.date(),
  ]),
  is_24h: z.coerce.boolean().default(false),
  notes: z.string().nullish(),
  is_present: z.coerce.boolean().default(true),
});

const { CollectionPointPresence, CollectionPoint, TaskSchedule, Task } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listPointPrecense = async (req, res) => {
  return await listSchedules(req, res);
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailPointPrecense = async (req, res) => {
  const { collectionPointId } = req.params;

  return detailTask(req, res);
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createPointPrecense = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const point = await CollectionPoint.findByPk(data.collection_point_id, {
    include: [{ model: TaskSchedule, where: { category: "point" }, required: false }],
  });
 
  if (!point) throw new createHttpError.NotFound("point pas trouvé");
  
  const presence = await TaskSchedule.create({
    ...data,

    name: point.name,
    category: "point",
    scheduled_date: data.day_of_week,
    recurrence_pattern: "weekly",
    collection_point_id: data.collection_point_id,
    store_id: point.recyclery_id,
  });


  res.json({
    success: true,
    message: "Jours de présence créés avec succès",
    id: presence.id,
    presence,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updatePointPrecense = async (req, res) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const existing = await TaskSchedule.findByPk(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Jours de présence non trouvés",
    });
  }

  const { day_of_week, ...rest } = data;
  await existing.update({
    ...rest,
    scheduled_date: day_of_week,

  });

  res.json({
    success: true,
    message: "Jours de présence mis à jour avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deletePointPrecense = async (req, res) => {
  const id = z.coerce.number().positive().parse(req.params.id);
  return deleteSchedule(req, res);
};
