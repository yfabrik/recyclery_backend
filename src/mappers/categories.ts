import type { CategoryDto } from "@recyclerie/api/responses/categories";

import type Category from "../models/category.js";
import type Promotion from "../models/promotion.js";
import { toPromotionDto } from "./promotions.js";
import { toIsoDate, toNumber, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type CategoryMapperInput = MapperInput<Category> & {
  subcategories?: Array<MapperInput<Category>>;
  parent?: MapperInput<Category>;
  Promotions?: Array<MapperInput<Promotion>>;
};

export const toCategoryDto = (model: CategoryMapperInput): CategoryDto =>
  stripUndefined({
    id: model.id,
    name: model.name,
    description: model.description ?? null,
    icon: model.icon ?? null,
    parent_id: model.parent_id ?? null,
    defaultWeight:
      model.defaultWeight != null ? toNumber(model.defaultWeight) : undefined,
    defaultPrice:
      model.defaultPrice != null ? toNumber(model.defaultPrice) : undefined,
    IO: model.IO != null ? toNumber(model.IO) : undefined,
    priceBasedOnWeight: model.priceBasedOnWeight,
    bundleQuantity: toOptionalNumber(model.bundleQuantity) ?? null,
    bundlePrice: toOptionalNumber(model.bundlePrice) ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    subcategories: model.subcategories?.map(toCategoryDto),
    parent: model.parent ? toCategoryDto(model.parent) : undefined,
    Promotions: model.Promotions?.map(toPromotionDto),
  }) satisfies CategoryDto;
