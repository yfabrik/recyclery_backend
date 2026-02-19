import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import * as z from "zod";
import db from "../../models/index.js";
import { idSchema } from "../../services/zod.js";
const { User } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const register = async (req, res, next) => {
  const dataSchema = z.object({
    username: z.string("Nom d'utilisateur requis"),
    email: z.email("email requis"),
    password: z.string("password requis"),
    role: z.string().default("employee"),
    recyclery_id: idSchema().optional(),
  });

  const data = dataSchema.parse(req.body);

  //FIXME
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
      // recyclery_id: user.recyclery_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );

  res.status(201).json({
    message: "Utilisateur créé avec succès",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      // recyclery_id: user.recyclery_id,
    },
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const login = async (req, res, next) => {
  const dataSchema = z.object({
    email: z.email("Email et mot de passe requis"),
    password: z.string("Email et mot de passe requis"),
  });
  const data = dataSchema.parse(req.body);

  const user = await User.scope("withPassword").findOne({
    where: { email: data.email },
  });
  if (!user)
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");

  // Use password_hash field for comparison (password is virtual and returns undefined)
  const isValidPassword = await bcrypt.compare(
    data.password,
    user.password_hash,
  );
  if (!isValidPassword) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }

  user.last_login = new Date();
  await user.save();
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  return res.json({
    message: "Connexion réussie",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      // first_name: user.first_name,
      // last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      // role_display_name: user.role_display_name,
      // role_level: user.role_level,
      // recyclery_id: user.recyclery_id,
      // recyclery_name: user.recyclery_name,
    },
  });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const userProfile = async (req, res) => {
  // const id = req.user.id;
  // const user = await User.findByPk(id);
  // if (!user)
  //   throw createHttpError[404]
  const user = req.user;
  let permissions = [];
  let permissionsByModule = {};

  if (user.role === "admin") {
    permissions.push("*"); // Tous les droits
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

  res.json({
    success: true,
    user,
    permissions,
    permissionsByModule,
  });
};
