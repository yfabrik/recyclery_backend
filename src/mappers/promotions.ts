import type { PromotionDto } from "@recyclerie/api/responses/promotions";

import type Category from "../models/category.js";
import type Promotion from "../models/promotion.js";
import type Recyclery from "../models/recyclery.js";
import { toCategoryRef, toRecycleryRef } from "./refs.js";
import { toIsoDate, toNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type PromotionMapperInput = MapperInput<Promotion> & {
  Category?: MapperInput<Category>;
  stores?: Array<MapperInput<Recyclery>>;
};

export const toPromotionDto = (model: PromotionMapperInput): PromotionDto =>
  stripUndefined({
    id: model.id,
    startDate: model.startDate,
    endDate: model.endDate ?? null,
    isActive: model.isActive,
    promotionValue: toNumber(model.promotionValue),
    category_id: model.category_id,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    Category: toCategoryRef(model.Category),
    stores: model.stores
      ?.map((store) => toRecycleryRef(store))
      .filter((store): store is NonNullable<typeof store> => store != null),
  }) as PromotionDto;
