import createHttpError from "http-errors";
import db from "../models/index.js";
import { listCaisses } from "../services/caisse.js";
const { Recyclery, CashRegister, User } = db;

export const listRecycleries = async (req, res) => {
  const recycleries = await Recyclery.findAll({
    // order: ["name", "ASC"],
    include: [
      { model: CashRegister, as: "caisses" },
      { model: User, as: "manager" },
    ],
  });
  res.json({ success: true, stores: recycleries, recycleries });
};

export const detailRecyclerie = async (req, res) => {
  const { id } = req.params;
  const recyclerie = await Recyclery.findByPk(id, {
    include: [
      { model: CashRegister, as: "caisses" },
      { model: User, as: "manager" },
    ],
  });

  res.json({ success: true, store: recyclerie });
};

export const createRecyclerie = async (req, res) => {
  const { name, address, phone, email, manager_id, city, postal_code } =
    req.body;

  if (!name)
    throw new createHttpError.BadRequest("Le nom de la recyclerie est requis");
  const recyclery = await Recyclery.create(
    name,
    address,
    phone,
    email,
    manager_id,
    city,
    postal_code
  );

  res.status(201).json({
    message: "Recyclerie créée avec succès",
    recyclery,
  });
};

export const updateRecyclerie = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    address,
    phone,
    email,
    manager_id,
    city,
    postal_code,
    is_active,
  } = req.body;

  if (!name)
    throw new createHttpError.BadRequest("Le nom de la recyclerie est requis");

  const recyclerie = await Recyclery.findByPk(id);
  if (!recyclerie) throw new createHttpError.NotFound("recyclerie non trouvé");

  recyclerie.name ??= name;
  recyclerie.address ??= address;
  recyclerie.phone ??= phone;
  recyclerie.email ??= email;
  recyclerie.manager_id ??= manager_id;
  recyclerie.city ??= city;
  recyclerie.postal_code ??= postal_code;
  recyclerie.is_active ??= is_active;
  await recyclerie.save();

  res.json({
    success: true,
    message: "Recyclerie mise à jour avec succès",
    recyclery: recyclerie,
  });
};

export const deleteRecyclerie = async (req, res) => {
  const { id } = req.params;

  const recyclerie = await Recyclery.destroy({ where: { id } });
  if (!recyclerie) throw new createHttpError.NotFound("Recyclerie non trouvée");

  res.json({ message: "Recyclerie supprimée avec succès" });
};

export const listCaissesRecyclerie = async (req, res) => {
  const { id } = req.params;

  const caisses = listCaisses(id);

  res.json({ success: true, cash_registers: caisses });
};

// export const createCaisse = async (req, res) => {
//   const { id } = req.params;
//   const { name } = req.body;

//   if (!name) {
//     throw new createHttpError.BadRequest("Le nom de la caisse est obligatoire");
//   }
//   const caisse = CashRegister.create({ name, recyclery_id: id });

//   res.status(201).json({
//     success: true,
//     message: "Caisse créée avec succès",
//     cash_register_id: caisse.id,
//   });
// };
