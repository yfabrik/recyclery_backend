import type { WasteDisposalDto } from "@recyclerie/api/responses/waste";

import type Category from "../models/category.js";
import type EcoOrganism from "../models/ecoorganism.js";
import type User from "../models/user.js";
import type WasteDisposal from "../models/wasteDisposal.js";
import { toCategoryRef, toEcoOrganismRef, toUserRef } from "./refs.js";
import { toIsoDate, toNumber, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type WasteDisposalMapperInput = MapperInput<WasteDisposal> & {
  category?: MapperInput<Category>;
  subcategory?: MapperInput<Category> | null;
  eco_organism?: MapperInput<EcoOrganism> | null;
  User?: MapperInput<User>;
};

export const toWasteDto = (model: WasteDisposalMapperInput): WasteDisposalDto =>
  stripUndefined({
    id: model.id,
    disposal_date: toIsoDate(model.disposal_date),
    disposal_type: model.disposal_type,
    weight_kg: toNumber(model.weight_kg),
    volume_m3: toOptionalNumber(model.volume_m3) ?? null,
    transport_method: model.transport_method ?? null,
    transport_company: model.transport_company ?? null,
    transport_cost: toOptionalNumber(model.transport_cost) ?? null,
    notes: model.notes ?? null,
    category_id: model.category_id,
    subcategory_id: model.subcategory_id ?? null,
    eco_organism_id: model.eco_organism_id ?? null,
    created_by: model.created_by,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    category: toCategoryRef(model.category),
    subcategory: toCategoryRef(model.subcategory) ?? null,
    eco_organism: toEcoOrganismRef(model.eco_organism) ?? null,
    User: toUserRef(model.User),
  }) satisfies WasteDisposalDto;
