///////////////////////////
//prevent circular dependency
///////////////////////////
import type { CategoryRefDto } from "@recyclerie/api/responses/categories";
import type { EcoOrganismRefDto } from "@recyclerie/api/responses/ecoOrganism";
import type { RecycleryRefDto } from "@recyclerie/api/responses/recycleries";
import type { UserRefDto } from "@recyclerie/api/responses/users";

import type Category from "../models/category.js";
import type EcoOrganism from "../models/ecoorganism.js";
import type Recyclery from "../models/recyclery.js";
import type User from "../models/user.js";
import { asEmail, asPhone } from "./brands.js";
import type { MapperInput, OptionalMapperInput } from "./types.js";

type CategoryRefInput = OptionalMapperInput<Category> & {
  subcategories?: Array<MapperInput<Category>>;
};

export const toCategoryRef = (
  value: OptionalMapperInput<Category>,
): CategoryRefDto | undefined => {
  if (value == null || typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    name: String(value.name ?? ""),
    description: value.description ?? null,
    icon: value.icon ?? null,
    parent_id: value.parent_id ?? null,
  } satisfies CategoryRefDto;
};

export const toCategoryRefWithSubcategories = (
  value: CategoryRefInput,
): (CategoryRefDto & { subcategories?: CategoryRefDto[] }) | undefined => {
  const ref = toCategoryRef(value);
  if (!ref || !Array.isArray(value?.subcategories)) {
    return ref;
  }

  const subcategories = value.subcategories
    .map((sub) => toCategoryRef(sub))
    .filter((sub): sub is CategoryRefDto => sub != null);

  return subcategories.length > 0 ? { ...ref, subcategories } : ref;
};

export const toEcoOrganismRef = (
  value: OptionalMapperInput<EcoOrganism>,
): EcoOrganismRefDto | undefined => {
  if (value == null || typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    name: String(value.name ?? ""),
    description: value.description ?? null,
    contact_email: asEmail(value.contact_email),
    contact_phone: asPhone(value.contact_phone),
    is_active: value.is_active,
  } satisfies EcoOrganismRefDto;
};

export const toUserRef = (
  value: OptionalMapperInput<User>,
): UserRefDto | undefined => {
  if (value == null || typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    username: value.username,
    email: asEmail(value.email),
    role: value.role,
  } satisfies UserRefDto;
};

export const toRecycleryRef = (
  value: OptionalMapperInput<Recyclery>,
): RecycleryRefDto | undefined => {
  if (value == null || typeof value.id !== "number") return undefined;
  return {
    id: value.id,
    name: String(value.name ?? ""),
    city: value.city ?? null,
    is_active: value.is_active,
  } satisfies RecycleryRefDto;
};
