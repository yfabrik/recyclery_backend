import createHttpError from "http-errors";

import { findUserByEmail } from "../../services/users.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { col, fn, Op, type Includeable } from "sequelize";
import {
  userAdminUpdatePasswordSchema,
  userCreateSchema,
  userListFilterSchema,
  userUpdateSchema,
} from "@recyclerie/api/schemas/users";
import type {
  CreateUserResponse,
  DeleteUserResponse,
  DetailUserResponse,
  ListUsersResponse,
  UpdateUserPasswordResponse,
  UpdateUserResponse,
  UserStatsByRoleDto,
  UserStatsResponse,
} from "@recyclerie/api/responses/users";
import {
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { toUserDto, toUserStatsDto } from "../../mappers/users.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere } from "./types.js";

const { Recyclery, User } = db;

export const listUsers = async (req: Request, res: Response) => {
  const filter = userListFilterSchema.parse(req.query);

  const where: ModelWhere<typeof User> = {};
  if (filter.role.length > 0) where.role = { [Op.in]: filter.role };
  if (filter.active) where.isActive = filter.active;

  const include: Includeable[] = [];
  if (filter.include.includes("managedStores"))
    include.push({
      model: Recyclery,
      as: "managedStores",
    });

  const users = await User.findAll({
    where,
    include,
  });

  res.json(
    apiData(users.map(toUserDto)) satisfies ListUsersResponse,
  );
};

export const findUserById = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const user = await findByPkOrThrow(User, id, "Utilisateur non trouvé", {
    include: [
      { model: Recyclery, as: "managedStores", required: false },
    ],
  });

  res.json(
    apiData(toUserDto(user)) satisfies DetailUserResponse,
  );
};

export const createUser = async (req: Request, res: Response) => {
  const data = userCreateSchema.parse(req.body);

  const existingUser = await findUserByEmail(data.email);
  if (existingUser)
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email existe déjà",
    );

  const { managedStores, ...userData } = data;
  const user = await db.sequelize.transaction(async (t) => {
    const created = await User.create(userData, { transaction: t });
    if (managedStores) {
      //TODO check role ?
      await created.addManagedStores(managedStores, { transaction: t });
    }
    return created;
  });

  res.json(
    apiData(toUserDto(user), {
      message: "Utilisateur créé avec succès",
    }) satisfies CreateUserResponse,
  );
};

export const updateUser = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = userUpdateSchema.parse(req.body);

  const user = await findByPkOrThrow(User, id, "Utilisateur non trouvé");
  const { managedStores, ...userData } = data;
  await db.sequelize.transaction(async (t) => {
    await user.update(userData, { transaction: t });
    if (managedStores) {
      await user.setManagedStores(managedStores, { transaction: t });
    }
  });

  res.json(
    apiData(toUserDto(user), {
      message: "Utilisateur mis à jour",
    }) satisfies UpdateUserResponse,
  );
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const user = await findByPkOrThrow(User, id, "utilisateur non trouvé");
  await user.destroy();
  res.json(
    apiMessage("user removed") satisfies DeleteUserResponse,
  );
};

export const userStats = async (_req: Request, res: Response) => {
  const totalUsers = await User.count();
  // Statistiques générales des utilisateurs

  const usersByRole = await User.findAll({
    attributes: ["role", [fn("COUNT", col("*")), "count"]],
    group: ["role"],
    raw: true,
  });

  // Statistiques des connexions récentes (dernières 30 jours)
  const recentLogins = await User.count({
    where: {
      last_login: {
        [Op.gte]: new Date(+new Date() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // Statistiques des employés actifs
  const activeEmployees = await User.count({
    where: { role: { [Op.in]: ["employee", "manager", "admin"] } },
  });

  res.json(
    apiData(
      toUserStatsDto({
        totalUsers,
        usersByRole: usersByRole as unknown as UserStatsByRoleDto[],
        recentLogins,
        activeEmployees,
      }),
    ) satisfies UserStatsResponse,
  );
};

export const updatePassword = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = userAdminUpdatePasswordSchema.parse(req.body);
  const user = await findByPkOrThrow(
    User.scope("withPassword"),
    id,
    "utilisateur non trouvé",
  );
  await user.update({
    password: data.newPassword,
  });

  res.json(
    apiMessage("password updated") satisfies UpdateUserPasswordResponse,
  );
};
