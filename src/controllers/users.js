import createHttpError from "http-errors";
import db from "../models/index.js";
import { findUserByEmail } from "../services/users.js";
const { User, Recyclery } = db;

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

export const findUserById = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id, { include: [{ model: Recyclery, as: "recycleries" }, { model: Recyclery, as: "managedStores" }] });
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  res.json({
    success: true,
    user,
  });
};

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
    // phone,
    // contract_hours,
  });

  res.json({
    success: true,
    message: "Utilisateur créé avec succès",
    user,
  });
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role, recyclery_id, phone, contract_hours } =
    req.body;
  const user = await User.findByPk(id);
  if (!user) throw new createHttpError.NotFound("Utilisateur non trouvé");

  user.username ??= username;
  user.email ??= email;
  user.role ??= role;
  user.recyclery_id ??= recyclery_id;
  user.phone ??= phone;
  user.contract_hours ??= contract_hours;
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.destroy({ where: { id } });
  res.json({
    success: true,
    message: "user removed"
  })
};
