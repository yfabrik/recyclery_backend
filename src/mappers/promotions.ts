import type { IsoDate } from "@recyclerie/api";
import type { PromotionDto } from "@recyclerie/api/responses/promotions";

import type Category from "../models/category.js";
import type Promotion from "../models/promotion.js";
import type Recyclery from "../models/recyclery.js";
import { toIsoDateTime, toIsoDate as toParisIsoDate } from "../utils/dates.js";
import { toCategoryRef, toRecycleryRef } from "./refs.js";
import { toNumber } from "./serialize.js";
import type {  MapperInput } from "./types.js";

type PromotionMapperInput = MapperInput<Promotion> & {
  Category?: MapperInput<Category>;
  stores?: Array<MapperInput<Recyclery>>;
};

export const toPromotionDto = (model: PromotionMapperInput): PromotionDto =>
  ({
    id: model.id,
    startDate: toParisIsoDate(model.startDate) as IsoDate,
    endDate:
      model.endDate != null
        ? (toParisIsoDate(model.endDate) as IsoDate)
        : null,
    isActive: model.isActive,
    promotionValue: toNumber(model.promotionValue),
    category_id: model.category_id,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    Category: toCategoryRef(model.Category),
    stores: model.stores
      ?.map((store) => toRecycleryRef(store))
      .filter((store): store is NonNullable<typeof store> => store != null),
  }) satisfies PromotionDto;
