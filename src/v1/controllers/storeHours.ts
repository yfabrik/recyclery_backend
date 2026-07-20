import createHttpError from "http-errors";
import { createStoreHoursDataSchema } from "@recyclerie/api/schemas/schedules";
import type {
  CreateStoreHoursResponse,
  ListStoreHoursResponse,
  UpdateStoreHoursResponse,
} from "@recyclerie/api/responses/taskSchedule";
import {
  apiCreated,
  apiData,
} from "@recyclerie/api/types/response";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

import { deleteSchedule } from "./taskSchedule.js";
import type { Request, Response } from "express";
import type { Includeable } from "sequelize";

import db from "../../models/index.js";
import { toStoreHoursDto, toTaskScheduleDto } from "../../mappers/taskSchedule.js";

const { TaskSchedule, Recyclery } = db;

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

const dataSchema = createStoreHoursDataSchema(getDateFromDay);

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

  const horaires = schedules.map(toStoreHoursDto);

  res.json(apiData(horaires) satisfies ListStoreHoursResponse);
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

  const storeHours = schedules.map(toStoreHoursDto);

  res.json(apiData(storeHours) satisfies ListStoreHoursResponse);
};

export const addHoraire = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);

  const store = await findByPkOrThrow(Recyclery, data.store_id, "magasin pas trouvé", {
    include: [
      {
        model: TaskSchedule,
        // as:"horaires",
        where: { category: "vente" },
        required: false,
      },
    ],
  });

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

  res.json(
    apiCreated({ id: horaires.id }, {
      message: "Horaires créés avec succès",
    }) satisfies CreateStoreHoursResponse,
  );
};

export const updateHoraire = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const schedule = await findByPkOrThrow(
    TaskSchedule,
    id,
    "horaires pas trouvé",
    {
      include: [{ model: Recyclery, required: false }],
    },
  );

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

  res.json(
    apiData(toTaskScheduleDto(schedule), {
      message: "Horaires mis à jour avec succès",
    }) satisfies UpdateStoreHoursResponse,
  );
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeHoraires = async (req: Request, res: Response) => {
  return deleteSchedule(req, res);
};
