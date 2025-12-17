import createHttpError from "http-errors";
import db from "../../models/index.js";

import { findUserByEmail } from "../../services/users.js";
import { col, fn, Op } from "sequelize";
const { User, Recyclery } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listUsers = async (req, res) => {
  const { store_id, role } = req.query;

  const where = {};
  if (store_id) where.recyclery_id = store_id;
  if (role) where.role = role;

  const users = await User.findAll({
    where,
    include: [
      {
        model: Recyclery,
        as: "managedStores",
      },
    ],
  });

  res.json({ users });
};

export const listEmployees = async (req, res) => {
  const users = await User.findAll({
    where: {
      role: "employee",
    },
  });

  res.json({ users });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const findUserById = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id, {
    include: [
      { model: Recyclery, as: "stores",required:false },
      { model: Recyclery, as: "managedStores",required:false },
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
  const {
    username,
    email,
    password,
    role = "employee",
    recyclery_id,
    phone,
    contract_hours = 35,
  } = req.body;
  if (!username || !email || !password)
    throw new createHttpError.BadRequest(
      "Nom d'utilisateur, email et mot de passe sont obligatoires"
    );
  const existingUser = await findUserByEmail(email);
  if (existingUser)
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email existe déjà"
    );

  const user = await User.create({
    username,
    email,
    password,
    role,
    recyclery_id,
    phone,
    contract_hours,
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
  const { username, email, role, recyclery_id, phone, contract_hours } =
    req.body;
  const user = await User.findByPk(id);
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  user.username = username || user.username;
  user.email = email || user.email;
  user.role = role || user.role;
  // user.recyclery_id = recyclery_id || user.recyclery_id;
  user.phone = phone || user.phone;
  user.contract_hours = contract_hours || user.contract_hours;
  await user.save();
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
