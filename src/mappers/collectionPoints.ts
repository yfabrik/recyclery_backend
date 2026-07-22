import type {
  CollectionPointDto,
  CollectionPointRefDto,
} from "@recyclerie/api/responses/collectionPoints";
import type { TaskScheduleRefDto } from "@recyclerie/api/responses/taskSchedule";

import type CollectionPoint from "../models/collectionpoint.js";
import type Recyclery from "../models/recyclery.js";
import type TaskSchedule from "../models/taskschedule.js";
import { asAlphanumeric, asEmail, asPhone, asPostal } from "./brands.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDateTime } from "./serialize.js";
import { toTaskScheduleRef } from "./taskSchedule.js";
import {
  type MapperInput,
  type OptionalMapperInput,
} from "./types.js";

export type CollectionPointMapperInput = MapperInput<CollectionPoint> & {
  Recyclery?: MapperInput<Recyclery> | null;
  TaskSchedules?: Array<MapperInput<TaskSchedule>>;
};


export const toCollectionPointDto = (
  model: CollectionPointMapperInput,
): CollectionPointDto =>
  ({
    id: model.id,
    name: model.name,
    address: model.address ,
    city: model.city,
    postal_code: asPostal(model.postal_code),
    contact_person: asAlphanumeric(model.contact_person),
    contact_phone: asPhone(model.contact_phone),
    contact_email: asEmail(model.contact_email),
    type: model.type,
    notes: model.notes ,
    is_active: model.is_active,
    recyclery_id: model.recyclery_id,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
    TaskSchedules: model.TaskSchedules?.map(toTaskScheduleRef).filter(
      (schedule): schedule is TaskScheduleRefDto => schedule != null,
    ),
  }) satisfies CollectionPointDto;

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
