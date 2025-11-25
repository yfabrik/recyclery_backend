import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import db from "../models/index.js";
import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
const { User } = db;

export const register = async (req, res, next) => {
  const {
    username,
    email,
    password,
    role = "employee",
    recyclery_id,
  } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new createHttpError[400](
      "Nom d'utilisateur, email et mot de passe requis"
    );
  }


  //FIXME
  const existingUser = await User.findOne({
    where: { [Op.or]: [{ email: email }, { username: username }] },
  });
  if (existingUser) {
    throw new createHttpError.Conflict(
      "Un utilisateur avec cet email ou nom d'utilisateur existe déjà"
    );
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role,
    recyclery_id,
  });

  const token = jwt.sign(
    {
      id: user.id,
      username,
      email,
      role,
      recyclery_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.status(201).json({
    message: "Utilisateur créé avec succès",
    token,
    user: {
      id: user.id,
      username,
      email,
      role,
      recyclery_id,
    },
  });
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new createHttpError[400]("Email et mot de passe requis");

  const user = await User.findOne({ where: { email: email } });
  if (!user)
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new createHttpError.Unauthorized("Email ou mot de passe incorrect");
  }

  user.lastLogin = new Date();
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
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      role_display_name: user.role_display_name,
      role_level: user.role_level,
      recyclery_id: user.recyclery_id,
      recyclery_name: user.recyclery_name,
    },
  });
};

export const userProfile = async (req, res) => {
  const id = req.user.id;
  const user = await User.findOne(id);

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
    user: {
      ...user,
      password: undefined, // Ne jamais renvoyer le mot de passe
    },
    permissions,
    permissionsByModule,
  });
};
