import type { AuthUserDto } from "@recyclerie/api/responses/auth";

import type User from "../models/user.js";
import { asEmail, asPhone } from "./brands.js";
import type { MapperInput } from "./types.js";

export const toAuthUserDto = (model: MapperInput<User>): AuthUserDto =>
  ({
    id: model.id,
    username: model.username,
    email: asEmail(model.email),
    role: model.role,
    phone: asPhone(model.phone),
  }) satisfies AuthUserDto;

export const toAuthUserDtoFromFields = (fields: {
  id: number;
  username: string;
  email: string;
  role: AuthUserDto["role"];
  phone?: string | null;
}): AuthUserDto =>
  ({
    id: fields.id,
    username: fields.username,
    email: asEmail(fields.email),
    role: fields.role,
    phone: asPhone(fields.phone),
  }) satisfies AuthUserDto;
