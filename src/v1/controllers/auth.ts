import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import {
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "@recyclerie/api/schemas/auth";
import type {
  PermissionAction,
  PermissionModule,
} from "@recyclerie/api/enums";
import type {
  LoginResponse,
  RegisterResponse,
  UpdatePasswordResponse,
  UpdateProfileResponse,
  UserProfileResponse,
} from "@recyclerie/api/responses/auth";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { getJwtSecret } from "../../config/jwt.js";
import db from "../../models/index.js";
import {
  toAuthUserDto,
  toAuthUserDtoFromFields,
} from "../../mappers/auth.js";
import type { RequestWithUser } from "./types.ts";
const { User } = db;
export const register = async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  //FIXME dans hook create ?
  const existingUser = await User.findOne({
    where: { [Op.or]: [{ email: data.email }, { username: data.username }] },
  });
  if (existingUser) {
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email ou nom d'utilisateur existe déjà",
    );
  }
  const user = await User.create({
    ...data,
    password: data.password,
  });
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "24h" },
  );
  res.status(201).json(
    apiCreated(
      {
        token,
        user: toAuthUserDtoFromFields({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        }),
      },
      { message: "Utilisateur créé avec succès" },
    ) satisfies RegisterResponse,
  );
};
export const login = async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const user = await User.scope("withPassword").findOne({
    where: { email: data.email },
  });
  if (!user)
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  if (!user.password_hash)
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  const isValidPassword = await bcrypt.compare(
    data.password,
    user.password_hash,
  );
  if (!isValidPassword) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }
  user.last_login = new Date();
  await user.save();
  const token = jwt.sign({ id: user.id }, getJwtSecret(), {
    expiresIn: "24h",
  });
  return res.json(
    apiData(
      {
        token,
        user: toAuthUserDtoFromFields({
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
        }),
      },
      { message: "Connexion réussie" },
    ) satisfies LoginResponse,
  );
};
export const userProfile = (req: RequestWithUser, res: Response) => {
  const user = req.user;
  const permissions: (PermissionAction | "*")[] = [];
  let permissionsByModule: Partial<
    Record<PermissionModule, PermissionAction[]>
  > = {};
  if (user.role === "admin") {
    permissions.push("*");
    permissionsByModule = {
      dashboard: ["read", "write"],
      inventory: ["read", "write", "delete"],
      sales: ["read", "write", "delete"],
      logistics: ["read", "write", "delete"],
      management: ["read", "write", "delete"],
      planning: ["read", "write", "delete"],
      administration: ["read", "write", "delete"],
    };
  } else if (user.role === "manager") {
    permissions.push("read", "write");
    permissionsByModule = {
      dashboard: ["read", "write"],
      inventory: ["read", "write"],
      sales: ["read", "write"],
      logistics: ["read", "write"],
      management: ["read", "write"],
      planning: ["read", "write"],
    };
  } else if (user.role === "employee") {
    permissions.push("read");
    permissionsByModule = {
      dashboard: ["read"],
      inventory: ["read"],
      sales: ["read", "write"],
      logistics: ["read"],
    };
  }
  res.json(
    apiData({
      user: toAuthUserDto(user),
      permissions,
      permissionsByModule,
    }) satisfies UserProfileResponse,
  );
};
export const updateProfile = async (req: RequestWithUser, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const user = req.user;
  await user.update(data);
  res.json(
    apiData(toAuthUserDto(user), {
      message: "Profile mis à jour",
    }) satisfies UpdateProfileResponse,
  );
};
export const updatePassword = async (req: RequestWithUser, res: Response) => {
  const data = updatePasswordSchema.parse(req.body);
  const user = await User.scope("withPassword").findByPk(req.user.id);
  if (!user || !user.password_hash) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }
  const isValidPassword = await bcrypt.compare(
    data.currentPassword,
    user.password_hash,
  );
  if (!isValidPassword) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }
  await user.update({ password: data.newPassword });
  res.json(
    apiMessage("Mot de passe mis à jour") satisfies UpdatePasswordResponse,
  );
};
