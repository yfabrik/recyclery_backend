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
import { toIsoDateTime, toOptionalNumber, toNumberOrUndefined } from "./serialize.js";
import type { MapperInput } from "./types.js";

export type LabeledItemMapperInput = MapperInput<LabeledItem> & {
  barcode: string;
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
  ({
    id: model.id,
    barcode: model.barcode,
    description: model.description,
    weight: model.weight,
    price: model.price,
    cost: model.cost,
    condition_state: model.condition_state,
    status: model.status,
    category_id: model.category_id,
    subcategory_id: model.subcategory_id ,
    recyclery_id: model.recyclery_id ,
    created_by: model.created_by,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    category:
      model.category != null
        ? toCategoryRefWithSubcategories(model.category)
        : undefined,
    subcategory: toCategoryRef(model.subcategory) ,
    recyclery: toRecycleryRef(model.recyclery) ,
    createdBy: toUserRef(model.createdBy) ,
  }) satisfies LabeledItemDto;

export const toLabeledItemStatsDto = (
  value: LabeledItemStatsRow | null | undefined,
): LabeledItemStatsDto | null => {
  if (value == null) return null;
  return ({
    total_items: toNumberOrUndefined(value.total_items),
    available_items: toOptionalNumber(value.available_items),
    sold_items: toOptionalNumber(value.sold_items),
    reserved_items: toOptionalNumber(value.reserved_items),
    total_value: toOptionalNumber(value.total_value),
  }) satisfies LabeledItemStatsDto;
};
