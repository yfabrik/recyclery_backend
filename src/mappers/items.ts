import type {
  LabeledItemDto,
  LabeledItemStatsDto,
} from "@recyclerie/api/responses/items";

import type Category from "../models/category.js";
import type LabeledItem from "../models/labeleditem.js";
import type Recyclery from "../models/recyclery.js";
import type User from "../models/user.js";
import {
  toCategoryRef,
  toCategoryRefWithSubcategories,
  toRecycleryRef,
  toUserRef,
} from "./refs.js";
import { toIsoDate, toNumber, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type LabeledItemMapperInput = MapperInput<LabeledItem> & {
  barcode?: string;
  category?: MapperInput<Category>;
  subcategory?: MapperInput<Category> | null;
  recyclery?: MapperInput<Recyclery> | null;
  createdBy?: MapperInput<User> | null;
};

export interface LabeledItemStatsRow {
  total_items?: number | string;
  available_items?: number | string | null;
  sold_items?: number | string | null;
  reserved_items?: number | string | null;
  total_value?: number | string | null;
}

export const toLabeledItemDto = (
  model: LabeledItemMapperInput,
): LabeledItemDto =>
  stripUndefined({
    id: model.id,
    barcode: String(model.barcode ?? model.id).padStart(12, "0"),//TODO il devrait pas avoir un barcode obligatoirement ?
    description: model.description ?? null,
    weight: toNumber(model.weight),
    price: toNumber(model.price),
    cost: toOptionalNumber(model.cost) ?? null,
    condition_state: model.condition_state,
    status: model.status,
    category_id: model.category_id,
    subcategory_id: model.subcategory_id ?? null,
    recyclery_id: model.recyclery_id ?? null,
    created_by: model.created_by ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    category:
      model.category != null
        ? toCategoryRefWithSubcategories(model.category)
        : undefined,
    subcategory: toCategoryRef(model.subcategory) ?? null,
    recyclery: toRecycleryRef(model.recyclery) ?? null,
    createdBy: toUserRef(model.createdBy) ?? null,
  }) satisfies LabeledItemDto;

export const toLabeledItemStatsDto = (
  value: LabeledItemStatsRow | null | undefined,
): LabeledItemStatsDto | null => {
  if (value == null) return null;
  return stripUndefined({
    total_items: value.total_items,
    available_items: value.available_items,
    sold_items: value.sold_items,
    reserved_items: value.reserved_items,
    total_value: value.total_value,
  }) satisfies LabeledItemStatsDto;
};
