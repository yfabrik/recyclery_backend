import type { UserDto, UserStatsDto } from "@recyclerie/api/responses/users";

import type Recyclery from "../models/recyclery.js";
import type User from "../models/user.js";
import { asEmail, asPhone } from "./brands.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDate, toOptionalIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type UserMapperInput = MapperInput<User> & {
  managedStores?: Array<MapperInput<Recyclery>>;
};

export const toUserDto = (model: UserMapperInput): UserDto =>
  stripUndefined({
    id: model.id,
    username: model.username,
    email: asEmail(model.email),
    role: model.role,
    phone: asPhone(model.phone),
    isActive: model.isActive,
    last_login: toOptionalIsoDate(model.last_login) ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    managedStores: model.managedStores
      ?.map((store) => toRecycleryRef(store))
      .filter((store): store is NonNullable<typeof store> => store != null),
  }) as UserDto;

export const toUserStatsDto = (stats: {
  totalUsers: number;
  usersByRole: UserStatsDto["usersByRole"];
  recentLogins: number;
  activeEmployees: number;
}): UserStatsDto => ({
  totalUsers: stats.totalUsers,
  usersByRole: stats.usersByRole,
  recentLogins: stats.recentLogins,
  activeEmployees: stats.activeEmployees,
});
