import type {
  EcoOrganismDto,
  EcoOrganismStatsDto,
  EcoOrgQuarterStatsDto,
} from "@recyclerie/api/responses/ecoOrganism";

import type Category from "../models/category.js";
import type EcoOrganism from "../models/ecoorganism.js";
import type WasteDisposal from "../models/wasteDisposal.js";
import { asEmail, asPhone, asUrl } from "./brands.js";
import { toCategoryRef } from "./refs.js";
import { toIsoDateTime, toOptionalNumber, toNumberOrUndefined } from "./serialize.js";
import type {  MapperInput } from "./types.js";
import { toWasteDto } from "./waste.js";

type EcoOrganismMapperInput = MapperInput<EcoOrganism> & {
  inCategories?: Array<MapperInput<Category>>;
  sellCategories?: Array<MapperInput<Category>>;
  WasteDisposals?: Array<MapperInput<WasteDisposal>>;
};

export interface EcoOrganismStatsRow {
  total_eco_organisms?: number | string;
  active_eco_organisms?: number | string | null;
  inactive_eco_organisms?: number | string | null;
}

export const toEcoOrganismDto = (
  model: EcoOrganismMapperInput,
): EcoOrganismDto =>
  ({
    id: model.id,
    name: model.name,
    description: model.description ,
    contact_email: asEmail(model.contact_email),
    contact_phone: asPhone(model.contact_phone),
    address: model.address,
    website: asUrl(model.website),
    is_active: model.is_active,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    inCategories: model.inCategories
      ?.map((cat) => toCategoryRef(cat))
      .filter((cat): cat is NonNullable<typeof cat> => cat != null),
    sellCategories: model.sellCategories
      ?.map((cat) => toCategoryRef(cat))
      .filter((cat): cat is NonNullable<typeof cat> => cat != null),
    WasteDisposals: model.WasteDisposals?.map(toWasteDto),
  }) satisfies EcoOrganismDto;

export const toEcoOrganismStatsDto = (
  value: EcoOrganismStatsRow | null | undefined,
): EcoOrganismStatsDto | null => {
  if (value == null) return null;
  return ({
    total_eco_organisms: toNumberOrUndefined(value.total_eco_organisms),
    active_eco_organisms: toOptionalNumber(value.active_eco_organisms),
    inactive_eco_organisms: toOptionalNumber(value.inactive_eco_organisms),
  }) satisfies EcoOrganismStatsDto;
};

export const toEcoOrgQuarterStatsDto = (
  value: EcoOrgQuarterStatsDto,
): EcoOrgQuarterStatsDto => value;
