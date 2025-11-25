import { Op } from "sequelize";
import db from "../models/index.js";

const { Arrival, Category, User, CollectionPoint } = db;

export const listArrivals = async (req, res) => {
  const { date_from, date_to, category_id, source_type, status } = req.query;
  const where = {};

  if (date_from) {
    where.arrival_date = {
      ...(where.arrival_date || {}),
      [Op.gte]: date_from,
    };
  }
  if (date_to) {
    where.arrival_date = { ...(where.arrival_date || {}), [Op.lte]: date_to };
  }
  if (category_id) where.category_id = category_id;
  if (source_type) where.source_type = source_type;
  if (status) where.status = status;
  const arrivals = await Arrival.findAll({
    where,
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json({
    success: true,
    arrivals: arrivals,
  });
};

export const detailArrival = async (req, res) => {
  const { id } = req.params;
  const arrival = await Arrival.findByPk(id, {
    include: [
      { model: Category, as: "categorie" },
      { model: Category, as: "subcategorie" },
      { model: User },
      { model: CollectionPoint },
    ],
  });
  if (!arrival) {
    return res.status(404).json({
      success: false,
      error: "Arrivage non trouvé",
    });
  }
  res.json({
    success: true,
    arrival: arrival,
  });
};

export const createArrival = async (req, res) => {
  const {
    category_id,
    subcategory_id,
    weight,
    arrival_date,
    arrival_time,
    source_type,
    source_details,
    collection_point_id,
    collection_point_name,
    collection_point_address,
    volunteer_donation,
    house_clearance,
    notes,
  } = req.body;

  // Validation
  if (!category_id || !weight || !arrival_date || !source_type) {
    return res.status(400).json({
      success: false,
      error:
        "La catégorie, le poids, la date d'arrivage et le type de source sont requis",
    });
  }

  const category = await Category.findByPk(category_id);
  // Vérifier si la catégorie existe

  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Catégorie non trouvée",
    });
  }

  const arrival = await Arrival.create({
    arrival_number: generateArrivalNumber(),
    category_id,
    subcategory_id,
    weight,
    arrival_date,
    arrival_time,
    source_type,
    source_details,
    collection_point_id,
    collection_point_name,
    collection_point_address,
    volunteer_donation,
    house_clearance,
    notes,
    processed_by: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Arrivage créé avec succès",
    arrival,
  });
};

export const updateArrival = async (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    subcategory_id,
    weight,
    arrival_date,
    arrival_time,
    source_type,
    source_details,
    collection_point_id,
    collection_point_name,
    collection_point_address,
    volunteer_donation,
    house_clearance,
    notes,
    status,
  } = req.body;

  // Validation
  if (!category_id || !weight || !arrival_date || !source_type) {
    return res.status(400).json({
      success: false,
      error:
        "La catégorie, le poids, la date d'arrivage et le type de source sont requis",
    });
  }
  const arrival = await Arrival.findByPk(id);
  // Vérifier si l'arrivage existe

  if (!arrival) {
    return res.status(404).json({
      success: false,
      error: "Arrivage non trouvé",
    });
  }
  arrival.category_id ??= category_id;
  arrival.subcategory_id ??= subcategory_id;
  arrival.weight ??= weight;
  arrival.arrival_date ??= arrival_date;
  arrival.arrival_time ??= arrival_time;
  arrival.source_type ??= source_type;
  arrival.source_details ??= source_details;
  arrival.collection_point_id ??= collection_point_id;
  arrival.collection_point_name ??= collection_point_name;
  arrival.collection_point_address ??= collection_point_address;
  arrival.volunteer_donation ??= volunteer_donation;
  arrival.house_clearance ??= house_clearance;
  arrival.notes ??= notes;
  arrival.status ??= status;

  await arrival.save();

  res.json({
    success: true,
    message: "Arrivage mis à jour avec succès",
  });
};

export const deleteArrival = async (req, res) => {
  const { id } = req.params;
  const arrival = await Arrival.destroy({where:{id}});
  // Vérifier si l'arrivage existe
  if (!arrival) {
    return res.status(404).json({
      success: false,
      error: "Arrivage non trouvé",
    });
  }
  res.json({
    success: true,
    message: "Arrivage supprimé avec succès",
  });
};

// Générer un numéro d'arrivage unique
const generateArrivalNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  return `ARR-${year}${month}${day}-${timestamp}`;
};
