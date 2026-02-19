import db from "../../models/index.js";
import logger from "../../services/logger.js";

const { StoreLocation, Recyclery } = db;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createStoreLocation = async (req, res) => {
  logger.warning("location called REMOVE");
  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const location = await StoreLocation.create({
    name,
    description,
    store_id,
    is_active,
  });

  res.status(201).json({
    message: "Lieu créé avec succès",
    location,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateStoreLocation = async (req, res) => {
  logger.warning("location called REMOVE");
  const { id } = req.params;
  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const updated = await StoreLocation.update(
    { name, description, store_id, is_active },
    { where: { id } },
  );

  if (updated === 0) {
    res.status(404).json({ message: "Lieu non trouvé" });
  } else {
    res.json({
      message: "Lieu mis à jour avec succès",
      location: {
        id: parseInt(id),
        name,
        description,
        store_id,
        is_active: is_active ? 1 : 0,
      },
    });
  }
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteStoreLocation = async (req, res) => {
  logger.warning("location called REMOVE");
  const { id } = req.params;
  const deleled = await StoreLocation.destroy({ where: { id } });

  if (deleled === 0) {
    res.status(404).json({ message: "Lieu non trouvé" });
  } else {
    res.json({ message: "Lieu supprimé avec succès" });
  }
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listStoreLocation = async (req, res) => {
  logger.warning("location called REMOVE");
  const { storeId } = req.params;

  const locations = await StoreLocation.findAll({
    where: { store_id: storeId },
    include: [{ model: Recyclery }],
    order: [["name"]],
  });

  res.json({ locations });
};
