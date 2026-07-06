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
import { toWasteDto } from "./waste.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

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
  stripUndefined({
    id: model.id,
    name: model.name,
    description: model.description ?? null,
    contact_email: asEmail(model.contact_email),
    contact_phone: asPhone(model.contact_phone),
    address: model.address ?? null,
    website: asUrl(model.website),
    is_active: model.is_active,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    inCategories: model.inCategories
      ?.map((cat) => toCategoryRef(cat))
      .filter((cat): cat is NonNullable<typeof cat> => cat != null),
    sellCategories: model.sellCategories
      ?.map((cat) => toCategoryRef(cat))
      .filter((cat): cat is NonNullable<typeof cat> => cat != null),
    WasteDisposals: model.WasteDisposals?.map(toWasteDto),
  }) as EcoOrganismDto;

export const toEcoOrganismStatsDto = (
  value: EcoOrganismStatsRow | null | undefined,
): EcoOrganismStatsDto | null => {
  if (value == null) return null;
  return stripUndefined({
    total_eco_organisms: value.total_eco_organisms,
    active_eco_organisms: value.active_eco_organisms,
    inactive_eco_organisms: value.inactive_eco_organisms,
  }) as EcoOrganismStatsDto;
};

export const toEcoOrgQuarterStatsDto = (
  value: EcoOrgQuarterStatsDto,
): EcoOrgQuarterStatsDto => value;
