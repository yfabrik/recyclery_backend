import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { createCollectionPointPresenceDataSchema } from "@recyclerie/api/schemas/schedules";
import type { CreateCollectionPointPresenceResponse } from "@recyclerie/api/responses/taskSchedule";
import { apiCreated, apiMessage } from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

import { detailTask } from "./tasks.js";

import { deleteSchedule, listSchedules } from "./taskSchedule.js";

import db from "../../models/index.js";
import { toTaskScheduleDto } from "../../mappers/taskSchedule.js";

const getDateFromDay = (
  day:
    | "Lundi"
    | "Mardi"
    | "Mercredi"
    | "Jeudi"
    | "Vendredi"
    | "Samedi"
    | "Dimanche",
) => {
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

const dataSchema = createCollectionPointPresenceDataSchema(getDateFromDay);

const { CollectionPoint, TaskSchedule } = db;

/**
 * @deprecated
 */
export const listPointPrecense = async (req: Request, res: Response) => {
  return await listSchedules(req, res);
};

/**
 * @deprecated
 */
export const detailPointPrecense = async (req: Request, res: Response) => {
  // const { collectionPointId } = req.params;

  return detailTask(req, res);
};

export const createPointPrecense = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);

  const point = await findByPkOrThrow(
    CollectionPoint,
    data.collection_point_id,
    "point pas trouvé",
    {
      include: [
        { model: TaskSchedule, where: { category: "point" }, required: false },
      ],
    },
  );

  const presence = await db.sequelize.transaction(async (t) => {
    return TaskSchedule.create(
      {
        ...data,
        name: point.name,
        category: "point",
        scheduled_date: data.day_of_week,
        recurrence_pattern: "weekly",
        collection_point_id: data.collection_point_id,
        store_id: point.recyclery_id,
      },
      { transaction: t },
    );
  });

  res.json(
    apiCreated(toTaskScheduleDto(presence), {
      message: "Jours de présence créés avec succès",
    }) satisfies CreateCollectionPointPresenceResponse,
  );
};

export const updatePointPrecense = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const existing = await findByPkOrThrow(
    TaskSchedule,
    id,
    "Jours de présence non trouvés",
  );

  const { day_of_week, is_present, ...rest } = data;
  await db.sequelize.transaction(async (t) => {
    await existing.update(
      {
        ...rest,
        is_recurring: is_present,
        scheduled_date: day_of_week,
      },
      { transaction: t },
    );
  });

  res.json(
    apiMessage("Jours de présence mis à jour avec succès"),
  );
};

/**
 * @deprecated
 */
export const deletePointPrecense = async (req: Request, res: Response) => {
  // const id = z.coerce.number().positive().parse(req.params.id);
  return deleteSchedule(req, res);
};
