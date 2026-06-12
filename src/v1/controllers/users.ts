import createHttpError from "http-errors";

import { findUserByEmail } from "../../services/users.js";
import { col, fn, Op, type Includeable } from "sequelize";
import * as z from "zod";
import { idSchema, phoneSchema } from "../../services/zod.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere } from "./types.js";

const { EmployeeWorkdays, Recyclery, User } = db;

export const listUsers = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["EmployeeWorkdays", "managedStores"];
  const filterSchema = z.object({
    store_id: z.coerce.number().optional(),
    role: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : [])),
    active: z.coerce.boolean().optional(),
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  });
  const filter = filterSchema.parse(req.query);

  const where: ModelWhere<typeof User> = {};
  // if (filter.store_id) where.recyclery_id = filter.store_id;
  if (filter.role.length > 0) where.role = { [Op.in]: filter.role };
  if (filter.active) where.isActive = filter.active;

  const include: Includeable[] = [];
  if (filter.include.includes("EmployeeWorkdays"))
    include.push({
      model: EmployeeWorkdays,
    });
  if (filter.include.includes("managedStores"))
    include.push({
      model: Recyclery,
      as: "managedStores",
    });
  // if (filter.include.includes("stores"))
  //   include.push({
  //     model: Recyclery,
  //     as: "stores",
  //   });

  const users = await User.findAll({
    where,
    include,
  });

  res.json({ users });
};

export const findUserById = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const user = await User.findByPk(id, {
    include: [
      // { model: Recyclery, as: "stores", required: false },
      { model: Recyclery, as: "managedStores", required: false },
    ],
  });
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  res.json({
    success: true,
    user,
  });
};

export const createUser = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    username: z.string("Nom d'utilisateur obligatoire").trim().nonempty(),
    email: z.email(" email obligatoire"),
    password: z.string(" mot de passe  obligatoire"),
    role: z
      .enum(["employee", "manager", "admin"]) //TODO type enum
      .optional()
      .default("employee"),
    managedStores: z.array(idSchema()).nullish(),
    phone: phoneSchema().nullish().prefault(null),
    // contract_hours: z.coerce.number().nullish(), //TODO le temps ça devrait pas dependre des heure de travail set ?
    isActive: z.coerce.boolean().optional().prefault(true),
  });

  const data = dataSchema.parse(req.body);

  const existingUser = await findUserByEmail(data.email);
  if (existingUser)
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email existe déjà",
    );

  const user = await User.create({
    ...data,
    // password: data.password
  });

  if (data.managedStores)
    //TODO check role ?
    await user.addManagedStores(data.managedStores); //TODO setmanagerStores ?

  res.json({
    success: true,
    message: "Utilisateur créé avec succès",
    user,
  });
};

export const updateUser = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const dataSchema = z.object({
    username: z.string("Nom d'utilisateur obligatoire").trim().nonempty(),
    email: z.email(" email obligatoire"),
    role: z
      .enum(["employee", "manager", "admin"]) //TODO type enum
      .optional()
      .default("employee"),
    managedStores: z.array(idSchema()).nullish(),
    phone: phoneSchema().nullish().prefault(null),
    // contract_hours: z.coerce.number().nullish(), //TODO le temps ça devrait pas dependre des heure de travail set ?
    isActive: z.coerce.boolean().optional().default(true),
  });

  const data = dataSchema.parse(req.body);

  const user = await User.findByPk(id);
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");
  await user.update({
    ...data,
  });
  if (data.managedStores) await user.setManagedStores(data.managedStores);

  res.json({
    success: true,
    user,
    message: "Utilisateur mis à jour",
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const user = await User.findByPk(id);
  if (!user) throw new createHttpError.NotFound("utilisateur non trouvé");
  await user.destroy();
  res.json({
    success: true,
    message: "user removed",
  });
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

  res.json({
    success: true,
    stats: {
      totalUsers: totalUsers,
      usersByRole: usersByRole,
      recentLogins: recentLogins,
      activeEmployees: activeEmployees,
    },
  });
};

export const updatePassword = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const dataSchema = z.object({
    // currentPassword: z.string("mot de passe actuel requis"),
    newPassword: z
      .string("nouveau mot de passe requis")
      .min(6, "mot de passe tros court"),
  });

  const data = dataSchema.parse(req.body);
  const user = await User.scope("withPassword").findByPk(id);
  if (!user) throw new createHttpError.NotFound("utilisateur non trouvé");
  // const isValidPassword = await bcrypt.compare(
  //   data.currentPassword,
  //   user.password_hash,
  // );
  // if (!isValidPassword) {
  //   throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  // }
  await user.update({
    password: data.newPassword,
  });

  res.json({
    success: true,
    message: "password updated",
  });
};
