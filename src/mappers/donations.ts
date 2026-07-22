import type { DonationDto, DonationStatsDto } from "@recyclerie/api/responses/donations";

import type Donation from "../models/donation.js";
import type User from "../models/user.js";
import { asAlphanumeric, asEmail, asPhone } from "./brands.js";
import { toUserRef } from "./refs.js";
import { requireUserId, toIsoDateTime, toOptionalNumber, toNumberOrUndefined } from "./serialize.js";
import type { MapperInput } from "./types.js";

type DonationMapperInput = MapperInput<Donation> & {
  User?: MapperInput<User> | null;
};

export interface DonationStatsRow {
  total_donations?: number | string;
  pending_donations?: number | string | null;
  accepted_donations?: number | string | null;
  rejected_donations?: number | string | null;
  total_estimated_value?: number | string | null;
}

export const toDonationDto = (model: DonationMapperInput): DonationDto =>
  ({
    id: model.id,
    donor_name: asAlphanumeric(model.donor_name),
    donor_phone: asPhone(model.donor_phone),
    donor_email: asEmail(model.donor_email),
    item_description: model.item_description ,
    estimated_value: model.estimated_value,
    status: model.status,
    weight: model.weight,
    recyclery_id: model.recyclery_id,
    received_by: requireUserId(model.received_by),
    received_at: toIsoDateTime(model.received_at),
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    User: toUserRef(model.User) ?? null,
  }) satisfies DonationDto;

export const toDonationStatsDto = (
  value: DonationStatsRow | null | undefined,
): DonationStatsDto | null => {
  if (value == null) return null;
  return ({
    total_donations: toNumberOrUndefined(value.total_donations),
    pending_donations: toOptionalNumber(value.pending_donations),
    accepted_donations: toOptionalNumber(value.accepted_donations),
    rejected_donations: toOptionalNumber(value.rejected_donations),
    total_estimated_value: toOptionalNumber(value.total_estimated_value),
  }) satisfies DonationStatsDto;
};
