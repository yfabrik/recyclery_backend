import { createStoreHoursDataSchema } from "@recyclerie/api/schemas/schedules";
import type {
  CreateStoreHoursResponse,
  ListStoreHoursResponse,
  UpdateStoreHoursResponse,
} from "@recyclerie/api/responses/taskSchedule";
import { apiCreated, apiData } from "@recyclerie/api/types/response";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

import { deleteSchedule } from "./taskSchedule.js";
import type { Request, Response } from "express";
import type { Includeable } from "sequelize";

import db from "../../models/index.js";
import {
  toStoreHoursDto,
  toTaskScheduleDto,
} from "../../mappers/taskSchedule.js";
import {
  combineDateAndTime,
  dateFromWeekday,
} from "../../utils/dates.js";

const { TaskSchedule, Recyclery } = db;

const dataSchema = createStoreHoursDataSchema;

/**
 *  @deprecated
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
        where: { category: "vente" },
        required: false,
      },
    ],
  });

  const scheduled_date = dateFromWeekday(data.day_of_week);
  const start_time = combineDateAndTime(scheduled_date, data.start_time);
  const end_time = combineDateAndTime(scheduled_date, data.end_time);

  const horaires = await db.sequelize.transaction(async (t) => {
    return TaskSchedule.create(
      {
        name: "vente-" + store.name,
        category: "vente",
        priority: "low",
        recurrence_pattern: "weekly",
        scheduled_date,
        start_time,
        end_time,
        notes: data.notes ?? null,
        status: "a",
        store_id: data.store_id,
      },
      { transaction: t },
    );
  });

  res.json(
    apiCreated(
      { id: horaires.id },
      {
        message: "Horaires créés avec succès",
      },
    ) satisfies CreateStoreHoursResponse,
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

  const scheduled_date = dateFromWeekday(data.day_of_week);
  const start_time = combineDateAndTime(scheduled_date, data.start_time);
  const end_time = combineDateAndTime(scheduled_date, data.end_time);

  await db.sequelize.transaction(async (t) => {
    await schedule.update(
      {
        // name: "vente-" + schedule.Recyclery?.name,// c'est le store qui set le name
        scheduled_date,
        start_time,
        end_time,
        notes: data.notes ?? null,
        status: "a",
        // store_id: data.store_id,//sert a rien de changer le store, ça revient a suppr la task schedule
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
 */
export const removeHoraires = async (req: Request, res: Response) => {
  return deleteSchedule(req, res);
};
