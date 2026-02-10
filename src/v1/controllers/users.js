import createHttpError from "http-errors";
import db from "../../models/index.js";

import { findUserByEmail } from "../../services/users.js";
import { col, fn, Op } from "sequelize";
import * as z from "zod";
import { idSchema, phoneSchema } from "../../services/zod.js";
import bcrypt from "bcryptjs";
const { User, Recyclery, EmployeeWorkdays } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listUsers = async (req, res) => {
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
      .transform((val) => (val ? val.split(",") : [])),
  });
  const filter = filterSchema.parse(req.query);

  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.store_id) where.recyclery_id = filter.store_id;
  if (filter.role.length > 0) where.role = { [Op.in]: filter.role };
  if (filter.active) where.isActive = filter.active;

  const include = [];
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

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
// export const listAllUsersInfo = async (req, res) => {
//   const { store_id, role, active } = req.query;
//   /**
//    * @type {import("sequelize").WhereOptions}
//    */
//   const where = {};
//   if (store_id) where.recyclery_id = store_id;
//   if (role) where.role = role;
//   if (active) where.isActive = active;

//   const users = await User.findAll({
//     attributes: { exclude: ["password"] },
//     where,
//     include: [
//       {
//         model: Recyclery,
//         as: "managedStores",
//       },
//       {
//         model: Recyclery,
//         as: "stores",
//       },
//       {
//         model: EmployeeWorkdays,
//       },
//     ],
//   });

//   res.json({ users });
// };
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
// export const listEmployees = async (req, res) => {
//   const users = await User.findAll({
//     where: {
//       role: "employee",
//     },
//   });

//   res.json({ users });
// };
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const findUserById = async (req, res) => {
  const { id } = req.params;
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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createUser = async (req, res) => {
  const dataSchema = z.object({
    username: z.string("Nom d'utilisateur obligatoire"),
    email: z.email(" email obligatoire"),
    password: z.string(" mot de passe  obligatoire"),
    role: z.string().optional().default("employee"),
    recyclery_id: idSchema().nullish(),
    phone: phoneSchema().nullish(),
    contract_hours: z.coerce.number().nullish(), //TODO le temps ça devrait pas dependre des heure de travail set ?
    isActive: z.coerce.boolean().nullish().default(true),
  });

  const data = dataSchema.parse(req.body);
  const existingUser = await findUserByEmail(data.email);
  if (existingUser)
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email existe déjà",
    );

  const user = await User.create({
    ...data,
    isActive: true,
  });

  res.json({
    success: true,
    message: "Utilisateur créé avec succès",
    user,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const dataSchema = z.object({
    username: z.string("Nom d'utilisateur obligatoire"),
    email: z.email(" email obligatoire"),
    role: z.string().nullish().default("employee"),
    recyclery_id: idSchema().nullish(),
    phone: phoneSchema().nullish(),
    contract_hours: z.coerce.number().nullish(), //TODO le temps ça devrait pas dependre des heure de travail set ?
    isActive: z.coerce.boolean().nullish().default(true),
  });

  const data = dataSchema.parse(req.body);

  const user = await User.findByPk(id);
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");
  await user.update({
    ...data,
  });

  // user.username = data.username || user.username;
  // user.email = data.email || user.email;
  // user.role = data.role || user.role;
  // user.recyclery_id = recyclery_id || user.recyclery_id;
  // user.phone = data.phone || user.phone;
  // user.contract_hours = data.contract_hours || user.contract_hours;
  // await user.save();
  res.json({
    success: true,
    user,
    message: "Utilisateur mis à jour",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.destroy({ where: { id } });
  res.json({
    success: true,
    message: "user removed",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const userStats = async (req, res) => {
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
        [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
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

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updatePassword = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const dataSchema = z.object({
    currentPassword: z.string("mot de passe actuel requis"),
    newPassword: z
      .string("nouveau mot de passe requis")
      .min(6, "mot de passe tros court"),
  });

  const data = dataSchema.parse(req.body);
  const user = await User.scope("withPassword").findByPk(id);
  if (!user) throw new createHttpError.NotFound("utilisateur non trouvé");
  const isValidPassword = await bcrypt.compare(
    data.currentPassword,
    user.password_hash,
  );
  if (!isValidPassword) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }
  await user.update({
    password: data.newPassword,
  });

  res.json({
    success: true,
    message: "password updated",
  });
};
