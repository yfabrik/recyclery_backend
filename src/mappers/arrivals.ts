import type {
  ArrivalCategoryStatsDto,
  ArrivalDto,
  ArrivalStatsDto,
} from "@recyclerie/api/responses/arrivals";

import type Arrival from "../models/arrival.js";
import type Category from "../models/category.js";
import type CollectionPoint from "../models/collectionpoint.js";
import type User from "../models/user.js";
import { toCollectionPointRef } from "./collectionPoints.js";
import { toCategoryRef, toUserRef } from "./refs.js";
import { toIsoDate, toNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type ArrivalMapperInput = MapperInput<Arrival> & {
  categorie?: MapperInput<Category>;
  subcategorie?: MapperInput<Category> | null;
  User?: MapperInput<User>;
  CollectionPoint?: MapperInput<CollectionPoint> | null;
};

export interface ArrivalStatsRow {
  total_arrivals?: number | string;
  total_weight?: number | string | null;
  from_collection_points?: number | string | null;
  volunteer_donations?: number | string | null;
  house_clearances?: number | string | null;
  pending_processing?: number | string | null;
  processed?: number | string | null;
}

export interface ArrivalCategoryStatsRow {
  count?: number | string;
  total_weight?: number | string | null;
  categorie?: MapperInput<Category>;
}

export const toArrivalDto = (model: ArrivalMapperInput): ArrivalDto =>
  stripUndefined({
    id: model.id,
    weight: toNumber(model.weight),
    arrival_date: toIsoDate(model.arrival_date),
    arrival_time: model.arrival_time != null ? String(model.arrival_time) : null,
    source_type: model.source_type,
    source_details: model.source_details ?? null,
    notes: model.notes ?? null,
    status: model.status,
    processed_by: model.processed_by,
    category_id: model.category_id,
    subcategory_id: model.subcategory_id ?? null,
    collection_point_id: model.collection_point_id ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    categorie: toCategoryRef(model.categorie),
    subcategorie: toCategoryRef(model.subcategorie) ?? null,
    User: toUserRef(model.User),
    CollectionPoint: toCollectionPointRef(model.CollectionPoint) ?? null,
  }) as ArrivalDto;

export const toArrivalStatsDto = (
  value: ArrivalStatsRow | null | undefined,
): ArrivalStatsDto => {
  if (value == null) {
    return {
      total_arrivals: 0,
      total_weight: 0,
      from_collection_points: 0,
      volunteer_donations: 0,
      house_clearances: 0,
      pending_processing: 0,
      processed: 0,
    };
  }
  return stripUndefined({
    total_arrivals: value.total_arrivals,
    total_weight: value.total_weight,
    from_collection_points: value.from_collection_points,
    volunteer_donations: value.volunteer_donations,
    house_clearances: value.house_clearances,
    pending_processing: value.pending_processing,
    processed: value.processed,
  }) as ArrivalStatsDto;
};

export const toArrivalCategoryStatsDto = (
  value: ArrivalCategoryStatsRow | null | undefined,
): ArrivalCategoryStatsDto =>
  stripUndefined({
    count: value?.count,
    total_weight: value?.total_weight,
    categorie: toCategoryRef(value?.categorie),
  }) as ArrivalCategoryStatsDto;
