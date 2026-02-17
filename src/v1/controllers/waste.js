import { col, fn, literal, Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import z from "zod";
import { idSchema } from "../../services/zod.js";

const { WasteDisposal, Category, EcoOrganism, User } = db;
const generateDisposalNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `SORT-${timestamp}-${random}`;
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */

export const listWaste = async (req, res) => {
  const filterSchema = z.object({
    category_id: idSchema().nullish(),
    subcategory_id: idSchema().nullish(),
    eco_organism_id: idSchema().nullish(),
    disposal_type: z.enum(["eco_organism", "landfill", "recycling", "other"]).nullish(),
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(50),
  });
  const filter = filterSchema.parse(req.query);

  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.category_id) where.category_id = filter.category_id;
  if (filter.subcategory_id) where.subcategory_id = filter.subcategory_id;
  if (filter.eco_organism_id) where.eco_organism_id = filter.eco_organism_id;
  if (filter.disposal_type) where.disposal_type = filter.disposal_type;

  if (filter.date_from || filter.date_to) {
    where.disposal_date = {};
    if (filter.date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(filter.date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.disposal_date[Op.gte] = dateFrom;
    }
    if (filter.date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(filter.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.disposal_date[Op.lte] = dateTo;
    }
  }

  const offset = filter.limit * (filter.page - 1 >= 0 ? filter.page - 1 : 0);
  const waste = await WasteDisposal.findAll({
    where,
    include: [
      { model: Category, as: "category" },
      { model: Category, as: "subcategory" },
      { model: EcoOrganism, as: "eco_organism" },
      { model: User },
    ],
    order: [["disposal_date", "DESC"]],
    offset,
    limit: 5,
  });

  // Get total count for pagination

  const wasteCount = await WasteDisposal.count({ where });
  res.json({
    disposals: waste,
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total: wasteCount,
      totalPages: Math.ceil(wasteCount / filter.limit),
    },
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailWaste = async (req, res) => {
  const { id } = req.params;
  const waste = await WasteDisposal.findByPk(id, {
    include: [
      { model: Category, as: "category" },
      { model: Category, as: "subcategory" },
      { model: EcoOrganism, as: "eco_organism" },
      { model: User },
    ],
  });

  if (!waste) throw new createHttpError[404]("Sortie de déchets non trouvée");
  res.json({ disposal: waste });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createWaste = async (req, res) => {
  const dataSchema = z.object({
    disposal_date: z.coerce.date("date de sortie requis"),
    category_id: idSchema("categorie requis"),
    subcategory_id: idSchema().nullish(),
    eco_organism_id: idSchema().nullish(),
    disposal_type: z.enum(["eco_organism", "landfill", "recycling", "other"], {
      message: "type de sortie requis",
    }),
    weight_kg: z.coerce.number().positive("poid requis"),
    volume_m3: z.coerce.number().nonnegative().nullish(),
    transport_method: z.string().nullish(),
    transport_company: z.string().nullish(),
    transport_cost: z.coerce.number().nonnegative().nullish(),
    notes: z.string().nullish(),
  });
  const data = dataSchema.parse(req.body);

  if (data.disposal_type === "eco_organism" && !data.eco_organism_id)
    throw new createHttpError[400](
      "Éco-organisme requis pour ce type de sortie",
    );

  // const disposal_number = generateDisposalNumber();

  const waste = await WasteDisposal.create({
    // disposal_number,
    // disposal_date,
    // disposal_type,
    // category_id: category_id || null,
    // subcategory_id: subcategory_id || null,
    // eco_organism_id: eco_organism_id || null,
    // weight_kg,
    // volume_m3,
    // transport_method,
    // transport_company,
    // transport_cost,
    // notes,
    ...data,
    created_by: req.user.id,
  });

  res.status(201).json({
    message: "Sortie de déchets créée avec succès",
    disposal_id: waste.id,
    // disposal_number: disposal_number,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateWaste = async (req, res) => {
  const dataSchema = z.object({
    disposal_date: z.coerce.date("date de sortie requis"),
    category_id: idSchema("categorie requis"),
    subcategory_id: idSchema().nullish(),
    eco_organism_id: idSchema().nullish(),
    disposal_type: z.enum(["eco_organism", "landfill", "recycling", "other"], {
      message: "type de sortie requis",
    }),
    weight_kg: z.coerce.number().positive("poid requis"),
    volume_m3: z.coerce.number().nonnegative().nullish(),
    transport_method: z.string().nullish(),
    transport_company: z.string().nullish(),
    transport_cost: z.coerce.number().nonnegative().nullish(),
    notes: z.string().nullish(),
  });
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);

  if (data.disposal_type === "eco_organism" && !data.eco_organism_id)
    throw new createHttpError[400](
      "Éco-organisme requis pour ce type de sortie",
    );

  const waste = await WasteDisposal.findByPk(id);
  if (!waste) throw createHttpError[404];
  await waste.update({ ...data });
  // waste.disposal_date = disposal_date;
  // waste.disposal_type = disposal_type;
  // waste.category_id = category_id;
  // waste.subcategory_id = subcategory_id;
  // waste.eco_organism_id = eco_organism_id;
  // waste.weight_kg = weight_kg;
  // waste.volume_m3 = volume_m3;
  // waste.transport_method = transport_method;
  // waste.transport_company = transport_company;
  // waste.transport_cost = transport_cost;
  // waste.notes = notes;
  // await waste.save();

  res.json({ message: "Sortie de déchets mise à jour avec succès" });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteWaste = async (req, res) => {
  const { id } = req.params;

  const deleted = await WasteDisposal.destroy({ where: { id } });

  if (deleted === 0)
    throw new createHttpError[404]("Sortie de déchets non trouvée");
  res.json({ message: "Sortie de déchets supprimée avec succès" });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const wasteStats = async (req, res) => {
  const filterSchema = z.object({
    date_from: z.coerce.date().nullish(),
    date_to: z.coerce.date().nullish(),
  });
  const filter = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  if (filter.date_from || filter.date_to) {
    where.disposal_date = {};
    if (filter.date_from) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(filter.date_from);
      dateFrom.setHours(0, 0, 0, 0);
      where.disposal_date[Op.gte] = dateFrom;
    }
    if (filter.date_to) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(filter.date_to);
      dateTo.setHours(23, 59, 59, 999);
      where.disposal_date[Op.lte] = dateTo;
    }
  }
  const stats = await WasteDisposal.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_disposals"],
      [fn("SUM", col("weight_kg")), "total_weight_kg"],
      [fn("SUM", col("volume_m3")), "total_volume_m3"],
      [fn("SUM", col("transport_cost")), "total_transport_cost"],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"),
        ),
        "eco_organism_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"),
        ),
        "landfill_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"),
        ),
        "other_disposals",
      ],
    ],
    where,
  });

  res.json({ stats });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const wasteStatsCategory = async (req, res) => {
  const { date_from, date_to } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (date_from) {
    where.disposal_date = {
      ...(where.disposal_date || {}),
      [Op.gte]: date_from,
    };
  }

  if (date_to) {
    where.disposal_date = {
      ...(where.disposal_date || {}),
      [Op.lte]: date_to,
    };
  }

  const stats = await WasteDisposal.findAll({
    attributes: [
      [fn("COUNT", col("*")), "total_disposals"],
      [fn("SUM", col("weight_kg")), "total_weight_kg"],
      [fn("SUM", col("volume_m3")), "total_volume_m3"],
      [fn("SUM", col("transport_cost")), "total_transport_cost"],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'eco_organism' THEN 1 ELSE 0 END"),
        ),
        "eco_organism_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'landfill' THEN 1 ELSE 0 END"),
        ),
        "landfill_disposals",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN disposal_type = 'other' THEN 1 ELSE 0 END"),
        ),
        "other_disposals",
      ],
    ],
    where,
    include: [{ model: Category, as: "categorie" }],
    order: [["total_weight_kg", "DESC"]],
    group: ["id", "categorie.name"],
  });

  res.json({ stats });
};
