import type { RecurrencePattern } from "@recyclerie/api/enums";
import type {
  CollectionPointDto,
  CollectionPointRefDto,
} from "@recyclerie/api/responses/collectionPoints";

import type CollectionPoint from "../models/collectionpoint.js";
import type Recyclery from "../models/recyclery.js";
import type TaskSchedule from "../models/taskschedule.js";
import { asAlphanumeric, asEmail, asPhone, asPostal } from "./brands.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDate, toOptionalIsoDate } from "./serialize.js";
import {
  stripUndefined,
  type MapperInput,
  type OptionalMapperInput,
} from "./types.js";
import type { TaskScheduleDto } from "@recyclerie/api";

export type CollectionPointMapperInput = MapperInput<CollectionPoint> & {
  Recyclery?: MapperInput<Recyclery> | null;
  TaskSchedules?: Array<TaskScheduleRefInput>;
};

type TaskScheduleRefInput = MapperInput<TaskSchedule> & {
  day_of_week?: string | null;
};

const toTaskScheduleRef = (
  value: TaskScheduleRefInput,
): TaskScheduleDto | undefined => {
  if (typeof value.id !== "number") return undefined;

  return stripUndefined({
    id: value.id,
    name: String(value.name ?? ""),
    is_recurring: value.is_recurring,
    category: value.category != null ? String(value.category) : undefined,
    scheduled_date: value.scheduled_date
      ? toOptionalIsoDate(value.scheduled_date)
      : undefined,
    start_time: value.start_time ? toOptionalIsoDate(value.start_time) : undefined,
    end_time: value.end_time ? toOptionalIsoDate(value.end_time) : undefined,
    day_of_week: value.day_of_week != null ? String(value.day_of_week) : undefined,
    recurrence_pattern:
      value.recurrence_pattern != null
        ? (value.recurrence_pattern as RecurrencePattern)
        : undefined,
    collection_point_id: value.collection_point_id ?? undefined,
    store_id: value.store_id ?? undefined,
  }) as TaskScheduleDto;
};

export const toCollectionPointDto = (
  model: CollectionPointMapperInput,
): CollectionPointDto =>
  stripUndefined({
    id: model.id,
    name: model.name,
    address: model.address ?? null,
    city: model.city ?? null,
    postal_code: asPostal(model.postal_code),
    contact_person: asAlphanumeric(model.contact_person),
    contact_phone: asPhone(model.contact_phone),
    contact_email: asEmail(model.contact_email),
    type: model.type,
    notes: model.notes ?? null,
    is_active: model.is_active,
    recyclery_id: model.recyclery_id ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
    TaskSchedules: model.TaskSchedules?.map(toTaskScheduleRef).filter(
      (schedule): schedule is TaskScheduleDto => schedule != null,
    ),
  }) as CollectionPointDto;

export const toCollectionPointRef = (
  model: OptionalMapperInput<CollectionPoint>,
): CollectionPointRefDto | undefined => {
  if (model == null || typeof model.id !== "number") return undefined;
  return {
    id: model.id,
    name: String(model.name ?? ""),
    city: model.city ?? null,
    is_active: model.is_active,
  } satisfies CollectionPointRefDto;
};
