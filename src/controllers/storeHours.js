import { Op } from "sequelize";
import db from "../models/index.js";

const { StoreHours, Recyclery } = db;

export const listHoraires = async (req, res) => {
  const horaires = await StoreHours.findAll({
    include: [{ model: Recyclery }],
  });

  res.json({
    success: true,
    storeHours: horaires,
  });
};

export const horairesMagasin = async (req, res) => {
  const { storeId } = req.params;

  const storeHours = await Recyclery.findByPk(storeId, {
    include: [{ model: StoreHours, as: "horaires" }],
    order: [["day_of_week"]],
  });

  res.json({
    success: true,
    storeHours,
  });
};

export const addHoraire = async (req, res) => {
  const {
    store_id,
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  } = req.body;

  // Validation des champs requis
  if (!store_id || !day_of_week) {
    console.log("Erreur validation: store_id ou day_of_week manquant");
    return res.status(400).json({
      success: false,
      message: "ID du magasin et jour de la semaine sont obligatoires",
    });
  }
  const store = await Recyclery.findByPk(store_id);

  if (await store.hasHoraires({ where: day_of_week })) {
    return res.status(400).json({
      success: false,
      message:
        "Des horaires existent déjà pour ce magasin, ce jour et ce créneau",
    });
  }
  const horaire = await store.createHoraire({
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  });

  res.json({
    success: true,
    message: "Horaires créés avec succès",
    id: horaire.id,
  });
};

export const updateHoraire = async (req, res) => {
  const { id } = req.params;
  const {
    store_id,
    day_of_week,
    time_slot_name,
    is_open,
    open_time,
    close_time,
    is_24h,
    notes,
  } = req.body;

  const existing = await StoreHours.findByPk(id);
  // Vérifier que les horaires existent
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Horaires non trouvés",
    });
  }

  const store = await Recyclery.findByPk(store_id, {
    include: [{ model: StoreHours, as: "horaires" }],
  });
  console.log(store);

  // Vérifier s'il n'y a pas de conflit avec d'autres horaires du même magasin, jour et créneau
  const duplicate = await store.countHoraires({
    where: { day_of_week, time_slot_name, id: { [Op.ne]: id } },
  });
  console.log(duplicate);
  if (duplicate) {
    return res.status(400).json({
      success: false,
      message:
        "Des horaires existent déjà pour ce magasin, ce jour et ce créneau",
    });
  }
  existing.day_of_week = day_of_week;
  existing.time_slot_name = time_slot_name;
  existing.open_time = open_time;
  existing.close_time = close_time;
  existing.is_24h = is_24h;
  existing.notes = notes;
  existing.is_open = is_open;

  await existing.save();

  res.json({
    success: true,
    message: "Horaires mis à jour avec succès",
  });
};

export const removeHoraires = async (req, res) => {
  const { id } = req.params;

  await StoreHours.destroy({ where: { id } });

  res.json({
    success: true,
    message: "Horaires supprimés avec succès",
  });
};
