import type { UserDto, UserStatsDto } from "@recyclerie/api/responses/users";

import type Recyclery from "../models/recyclery.js";
import type User from "../models/user.js";
import { asEmail, asPhone } from "./brands.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDateTime, toNumber } from "./serialize.js";
import type { MapperInput } from "./types.js";

type UserMapperInput = MapperInput<User> & {
  managedStores?: Array<MapperInput<Recyclery>>;
};

export const toUserDto = (model: UserMapperInput): UserDto =>
  ({
    id: model.id,
    username: model.username,
    email: asEmail(model.email),
    role: model.role,
    phone: asPhone(model.phone),
    isActive: model.isActive,
    last_login:model.last_login? toIsoDateTime(model.last_login):null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    managedStores: model.managedStores
      ?.map((store) => toRecycleryRef(store))
      .filter((store): store is NonNullable<typeof store> => store != null),
  }) satisfies UserDto;

export const toUserStatsDto = (stats: {
  totalUsers: number;
  usersByRole: Array<{ role: string; count: number | string }>;
  recentLogins: number;
  activeEmployees: number;
}): UserStatsDto =>
  ({
    totalUsers: stats.totalUsers,
    usersByRole: stats.usersByRole.map((row) => ({
      role: row.role,
      count: toNumber(row.count),
    })),
    recentLogins: stats.recentLogins,
    activeEmployees: stats.activeEmployees,
  }) satisfies UserStatsDto;
