import type { DonationDto } from "@recyclerie/api/responses/donations";

import type Donation from "../models/donation.js";
import type User from "../models/user.js";
import { asAlphanumeric, asEmail, asPhone } from "./brands.js";
import { toUserRef } from "./refs.js";
import { toIsoDate, toNumber, toOptionalIsoDate, toOptionalNumber } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type DonationMapperInput = MapperInput<Donation> & {
  User?: MapperInput<User> | null;
};

export const toDonationDto = (model: DonationMapperInput): DonationDto =>
  stripUndefined({
    id: model.id,
    donor_name: asAlphanumeric(model.donor_name),
    donor_phone: asPhone(model.donor_phone),
    donor_email: asEmail(model.donor_email),
    item_description: model.item_description ?? null,
    estimated_value: toOptionalNumber(model.estimated_value) ?? null,
    status: model.status,
    weight: toNumber(model.weight),
    recyclery_id: model.recyclery_id ?? null,
    received_by: model.received_by ?? null,
    received_at: toOptionalIsoDate(model.received_at),
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    User: toUserRef(model.User) ?? null,
  }) as DonationDto;
