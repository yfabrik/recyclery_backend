import { col, fn, literal, Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import * as z from "zod"
import { idSchema, nullishToNull } from "../../services/zod.js";
const { Arrival, Category, User, CollectionPoint } = db;
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listArrivals = async (req, res) => {
  const filterSchema = z.object({
    category_id: idSchema().optional(),
    source_type: z.enum(["point", "apport", "house_clearance"]).optional(),
    status: z.enum(["received"]).optional(),
    date_from: z.coerce.date(),
    date_to: z.coerce.date(),

  })
  const { date_from, date_to, ...rest } = filterSchema.parse(req.query)
  /**
 * @type {import("sequelize").WhereOptions}
 */
  const where = { ...rest };
  if (date_from) {
    where.arrival_date = {
      ...(where.arrival_date || {}),
      [Op.gte]: date_from,
    };
  }
  if (date_to) {
    where.arrival_date = { ...(where.arrival_date || {}), [Op.lte]: date_to };
  }

  const arrivals = await Arrival.findAll({
    where,
    include: [
      { model: Category, as: "categorie" },
      // { model: Category, as: "subcategorie" },
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
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
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
  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé")
  res.json({
    success: true,
    arrival: arrival,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createArrival = async (req, res) => {
  const dataSchema = z.object({
    category_id: idSchema("catégorie requis"),
    weight: z.coerce.number().positive("poids requis"),
    arrival_date: z.date("date d'arrivage requis"),
    arrival_time: z.date(" date d'arrivage requis"),
    source_type: z.enum(["point", "apport", "house_clearance"]),
    source_details: z.string().optional(),
    collection_point_id: idSchema().optional(),
    collection_point_name: z.string().optional(),
    collection_point_address: z.string().optional(),
    notes: z.string().optional(),
  })
  const data = dataSchema.parse(req.body)
  const category = await Category.findByPk(data.category_id);
  // Vérifier si la catégorie existe
  if (!category) throw new createHttpError[404]("Catégorie non trouvée")


  const arrival = await Arrival.create({
    ...data,
    processed_by: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Arrivage créé avec succès",
    arrival,
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const updateArrival = async (req, res) => {
  const dataSchema = z.object({
    category_id: idSchema("catégorie requis"),
    weight: z.coerce.number().positive("poids requis"),
    arrival_date: z.date("date d'arrivage requis"),
    arrival_time: z.date(" date d'arrivage requis"),
    source_type: z.enum(["point", "apport", "house_clearance"]),
    source_details: nullishToNull(z.string().optional()),
    collection_point_id: nullishToNull(idSchema().optional()),
    // collection_point_name: z.string().optional(),
    // collection_point_address: z.string().optional(),
    notes: nullishToNull(z.string().optional()),
  })
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body)

  const arrival = await Arrival.findByPk(id);
  // Vérifier si l'arrivage existe

  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé")
  await arrival.update({ ...data })

  res.json({
    success: true,
    message: "Arrivage mis à jour avec succès",
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const deleteArrival = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const arrival = await Arrival.destroy({ where: { id } });
  // Vérifier si l'arrivage existe
  if (!arrival) throw new createHttpError[404]("Arrivage non trouvé")
  res.json({
    success: true,
    message: "Arrivage supprimé avec succès",
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const statsSummary = async (req, res) => {
  const { date_from, date_to } = req.query;

  /**
   * @type {import("sequelize").WhereOptions}
   */
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

  const stats = await Arrival.findOne({
    attributes: [
      // COUNT(*)
      [fn("COUNT", col("*")), "total_arrivals"],

      // SUM(weight)
      [fn("SUM", col("weight")), "total_weight"],

      // COUNT(CASE WHEN source_type = 'collection_point')
      [
        fn(
          "COUNT",
          literal("CASE WHEN source_type = 'collection_point' THEN 1 END")
        ),
        "from_collection_points",
      ],

      // volunteer_donation = 1
      [
        fn("COUNT", literal("CASE WHEN volunteer_donation = 1 THEN 1 END")),
        "volunteer_donations",
      ],

      // house_clearance = 1
      [
        fn("COUNT", literal("CASE WHEN house_clearance = 1 THEN 1 END")),
        "house_clearances",
      ],

      // status = 'received'
      [
        fn("COUNT", literal("CASE WHEN status = 'received' THEN 1 END")),
        "pending_processing",
      ],

      // status = 'processed'
      [
        fn("COUNT", literal("CASE WHEN status = 'processed' THEN 1 END")),
        "processed",
      ],
    ],

    where,
    raw: true,
  });

  res.json({
    success: true,
    stats: stats || {
      total_arrivals: 0,
      total_weight: 0,
      from_collection_points: 0,
      volunteer_donations: 0,
      house_clearances: 0,
      pending_processing: 0,
      processed: 0,
    },
  });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const statsByCategories = async (req, res) => {
  const { date_from, date_to } = req.query;
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

  const stats = await Arrival.findAll({
    attributes: {
      include: [
        [fn("COUNT", col("*")), "count"],
        [fn("SUM", col("weight")), "total_weight"],
      ],
    },
    include: [{ model: Category, as: "categorie" }],
  });

  res.json({
    success: true,
    categories: stats || [],
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
