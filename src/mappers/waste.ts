import type {
  WasteDisposalDto,
  WasteStatsDto,
} from "@recyclerie/api/responses/waste";

import type Category from "../models/category.js";
import type EcoOrganism from "../models/ecoorganism.js";
import type User from "../models/user.js";
import type WasteDisposal from "../models/wasteDisposal.js";
import { toCategoryRef, toEcoOrganismRef, toUserRef } from "./refs.js";
import {
  requireUserId,
  toIsoDateTime,
  toNumber,
  toOptionalNumber,
  toNumberOrUndefined,
} from "./serialize.js";
import type { MapperInput } from "./types.js";

type WasteDisposalMapperInput = MapperInput<WasteDisposal> & {
  category?: MapperInput<Category>;
  subcategory?: MapperInput<Category> | null;
  eco_organism?: MapperInput<EcoOrganism> | null;
  User?: MapperInput<User> | null;
};

export interface WasteStatsRow {
  total_disposals?: number | string;
  total_weight_kg?: number | string | null;
  total_volume_m3?: number | string | null;
  total_transport_cost?: number | string | null;
  eco_organism_disposals?: number | string | null;
  landfill_disposals?: number | string | null;
  other_disposals?: number | string | null;
}

export const toWasteDto = (model: WasteDisposalMapperInput): WasteDisposalDto =>
  ({
    id: model.id,
    disposal_date: toIsoDateTime(model.disposal_date),
    disposal_type: model.disposal_type,
    weight_kg: toNumber(model.weight_kg),
    volume_m3: model.volume_m3,
    transport_method: model.transport_method,
    transport_company: model.transport_company,
    transport_cost: model.transport_cost,
    notes: model.notes,
    category_id: model.category_id,
    subcategory_id: model.subcategory_id,
    eco_organism_id: model.eco_organism_id,
    created_by: requireUserId(model.created_by),
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    category: toCategoryRef(model.category),
    subcategory: toCategoryRef(model.subcategory),
    eco_organism: toEcoOrganismRef(model.eco_organism),
    User: toUserRef(model.User),
  }) satisfies WasteDisposalDto;

export const toWasteStatsDto = (
  value: WasteStatsRow | null | undefined,
): WasteStatsDto | null => {
  if (value == null) return null;
  return ({
    total_disposals: toNumberOrUndefined(value.total_disposals),
    total_weight_kg: toOptionalNumber(value.total_weight_kg),
    total_volume_m3: toOptionalNumber(value.total_volume_m3),
    total_transport_cost: toOptionalNumber(value.total_transport_cost),
    eco_organism_disposals: toOptionalNumber(value.eco_organism_disposals),
    landfill_disposals: toOptionalNumber(value.landfill_disposals),
    other_disposals: toOptionalNumber(value.other_disposals),
  }) satisfies WasteStatsDto;
};
