import createHttpError from "http-errors";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";

import { deleteSchedule } from "./taskSchedule.js";
import type { Request, Response } from "express";
import type { Includeable } from "sequelize";

import db from "../../models/index.js";

const { TaskSchedule, Recyclery } = db;

const dataSchema = z.object({
  store_id: idSchema("ID du magasin et jour de la semaine sont obligatoires"),
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

  is_recurring: z.coerce.boolean().default(true),
  start_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date().setHours(+(hours ?? 0), +(min ?? 0));
    }),
    z.coerce.date(),
  ]),
  end_time: z.union([
    z.iso.time().transform((val) => {
      const [hours, min] = val.split(":");
      return new Date().setHours(+(hours ?? 0), +(min ?? 0));
    }),
    z.coerce.date(),
  ]),
  is_24h: z.coerce.boolean().default(false),
  notes: z.string().nullish(),
});
/**
 *
 * @param  day
 * @returns
 */
const getDateFromDay = (day: string) => {
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

/**
 *  @deprecated
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 */
export const listHoraires = async (_req: Request, res: Response) => {
  logger.warn("list horaires magasin plus a jour");
  const where = {
    category: "vente",
  };
  const include: Includeable[] = [];
  const schedules = await TaskSchedule.findAll({
    where,
    include,
  });

  const horaires = schedules.map((schedule) => {
    return {
      id: schedule.id,
      name: schedule.name,
      day_of_week: schedule.day_of_week,
      is_open: true,
      open_time: schedule.start_time,
      close_time: schedule.end_time,
      is_24h: false,
      notes: "",
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      store_id: schedule.store_id,
    };
  });

  // const horaires = await StoreHours.findAll({
  //   include: [{ model: Recyclery }],
  // });

  res.json({
    success: true,
    storeHours: horaires,
  });
};
/**
 *  @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const horairesMagasin = async (req: Request, res: Response) => {
  logger.warn("list horaires magasin plus a jour");

  const { storeId } = req.params;
  const where = {
    category: "vente",
  };
  const include = [
    {
      model: Recyclery,
      where: { id: storeId },
    },
  ];
  const schedules = await TaskSchedule.findAll({
    where,
    include,
  });

  const storeHours = schedules.map((schedule) => {
    return {
      id: schedule.id,
      is_open: true,
      open_time: schedule.start_time,
      close_time: schedule.end_time,
      is_24h: false,
      notes: "",
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      store_id: schedule.store_id,
    };
  });

  // const storeHours = await Recyclery.findByPk(storeId, {
  //   include: [{ model: StoreHours, as: "horaires" }],
  //   order: [["day_of_week"]],
  // });

  res.json({
    success: true,
    storeHours,
  });
};

export const addHoraire = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);

  const store = await Recyclery.findByPk(data.store_id, {
    include: [
      {
        model: TaskSchedule,
        // as:"horaires",
        where: { category: "vente" },
        required: false,
      },
    ],
  });

  if (!store) throw new createHttpError.NotFound("magasin pas trouvé");

  const horaires = await db.sequelize.transaction(async (t) => {
    return TaskSchedule.create(
      {
        name: "vente-" + store.name,
        category: "vente",
        priority: "low",
        recurrence_pattern: "weekly",
        scheduled_date: data.day_of_week,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        notes: null,
        status: "a",
        store_id: data.store_id,
      },
      { transaction: t },
    );
  });

  res.json({
    success: true,
    message: "Horaires créés avec succès",
    id: horaires.id,
  });
};

export const updateHoraire = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const schedule = await TaskSchedule.findByPk(id, {
    include: [{ model: Recyclery, required: false }],
  });
  if (!schedule) throw new createHttpError.NotFound("horaires pas trouvé");

  await db.sequelize.transaction(async (t) => {
    await schedule.update(
      {
        name: "vente-" + schedule.Recyclery?.name,
        scheduled_date: data.day_of_week,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        notes: null,
        status: "a",
        store_id: data.store_id,
        is_recurring: data.is_recurring,
      },
      { transaction: t },
    );
  });

  res.json({
    success: true,
    message: "Horaires mis à jour avec succès",
    horaire: schedule,
  });
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeHoraires = async (req: Request, res: Response) => {
  return deleteSchedule(req, res);
};
