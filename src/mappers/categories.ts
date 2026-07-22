import type { CategoryDto } from "@recyclerie/api/responses/categories";

import type Category from "../models/category.js";
import type Promotion from "../models/promotion.js";
import { toPromotionDto } from "./promotions.js";
import { toIsoDateTime } from "./serialize.js";
import type { MapperInput } from "./types.js";

type CategoryMapperInput = MapperInput<Category> & {
  subcategories?: Array<MapperInput<Category>>;
  parent?: MapperInput<Category>;
  Promotions?: Array<MapperInput<Promotion>>;
};

export const toCategoryDto = (model: CategoryMapperInput): CategoryDto =>
  ({
    id: model.id,
    name: model.name,
    description: model.description ,
    icon: model.icon ,
    parent_id: model.parent_id,
    defaultWeight:
      model.defaultWeight ,
    defaultPrice:
      model.defaultPrice ,
    IO: model.IO ,
    priceBasedOnWeight: model.priceBasedOnWeight,
    bundleQuantity: model.bundleQuantity,
    bundlePrice: model.bundlePrice,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    subcategories: model.subcategories?.map(toCategoryDto),
    parent: model.parent ? toCategoryDto(model.parent) : undefined,
    Promotions: model.Promotions?.map(toPromotionDto),
  }) satisfies CategoryDto;
