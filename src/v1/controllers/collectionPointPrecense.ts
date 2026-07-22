import type { Request, Response } from "express";
import { createCollectionPointPresenceDataSchema } from "@recyclerie/api/schemas/schedules";
import type { CreateCollectionPointPresenceResponse } from "@recyclerie/api/responses/taskSchedule";
import { apiCreated, apiMessage } from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

import { detailTask } from "./tasks.js";

import { deleteSchedule, listSchedules } from "./taskSchedule.js";

import db from "../../models/index.js";
import { toTaskScheduleDto } from "../../mappers/taskSchedule.js";
import {
  combineDateAndTime,
  dateFromWeekday,
} from "../../utils/dates.js";

const dataSchema = createCollectionPointPresenceDataSchema;

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

  const scheduled_date = dateFromWeekday(data.day_of_week);
  const start_time = combineDateAndTime(scheduled_date, data.start_time);
  const end_time = combineDateAndTime(scheduled_date, data.end_time);

  const presence = await db.sequelize.transaction(async (t) => {
    return TaskSchedule.create(
      {
        name: point.name,
        category: "point",
        scheduled_date,
        start_time,
        end_time,
        notes: data.notes ?? null,
        is_recurring: data.is_present,
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

  const scheduled_date = dateFromWeekday(data.day_of_week);
  const start_time = combineDateAndTime(scheduled_date, data.start_time);
  const end_time = combineDateAndTime(scheduled_date, data.end_time);

  await db.sequelize.transaction(async (t) => {
    await existing.update(
      {
        scheduled_date,
        start_time,
        end_time,
        notes: data.notes ?? null,
        is_recurring: data.is_present,
        store_id: data.store_id,
        collection_point_id: data.collection_point_id,
      },
      { transaction: t },
    );
  });

  res.json(apiMessage("Jours de présence mis à jour avec succès"));
};

/**
 * @deprecated
 */
export const deletePointPrecense = async (req: Request, res: Response) => {
  return deleteSchedule(req, res);
};
