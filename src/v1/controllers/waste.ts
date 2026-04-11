import { col, fn, literal, Op, type Attributes, type WhereOptions } from "sequelize";
import createHttpError from "http-errors";
import z from "zod";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import WasteDisposal from "../../models/wasteDisposal.js";
import Category from "../../models/category.js";
import EcoOrganism from "../../models/ecoorganism.js";
import User from "../../models/user.js";
import { formatWhereDateRange } from "../../helpers.js";


const dataSchema = z.object({
  disposal_date: z.coerce.date("date de sortie requis"),
  category_id: idSchema("categorie requis"),
  subcategory_id: idSchema().nullish().prefault(null),
  eco_organism_id: idSchema().nullish().prefault(null),
  disposal_type: z.enum(["eco_organism", "landfill", "recycling", "other"], {
    message: "type de sortie requis",
  }),
  weight_kg: z.coerce.number().positive("poid requis"),
  volume_m3: z.coerce.number().nonnegative().nullish().prefault(null),
  transport_method: z.string().nullish().prefault(null),
  transport_company: z.string().nullish().prefault(null),
  transport_cost: z.coerce.number().nonnegative().nullish().prefault(null),
  notes: z.string().nullish().prefault(null),
}).superRefine((obj, ctx) => {
  if (obj.disposal_type === "eco_organism" && !obj.eco_organism_id)
    ctx.addIssue({
      code: "custom",
      origin: "disposal_type",
      message: "Éco-organisme requis pour ce type de sortie",
      input: obj
    })
});

export const listWaste = async (req: Request, res: Response) => {
  const filterSchema = z.object({
    category_id: idSchema().nullish(),
    subcategory_id: idSchema().nullish(),
    eco_organism_id: idSchema().nullish(),
    disposal_type: z
      .enum(["eco_organism", "landfill", "recycling", "other"])
      .nullish(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(50),
  });
  const filter = filterSchema.parse(req.query);

  const where: WhereOptions<Attributes<WasteDisposal>> = {};
  if (filter.category_id) where.category_id = filter.category_id;
  if (filter.subcategory_id) where.subcategory_id = filter.subcategory_id;
  if (filter.eco_organism_id) where.eco_organism_id = filter.eco_organism_id;
  if (filter.disposal_type) where.disposal_type = filter.disposal_type;
  const dateRange = formatWhereDateRange(filter.date_from, filter.date_to);
  if (dateRange) where.disposal_date = dateRange;

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
    // limit: 5,
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

export const detailWaste = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
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

export const createWaste = async (req: Request & { user: User }, res: Response) => {

  const data = dataSchema.parse(req.body);


  const waste = await WasteDisposal.create({
    ...data,
    created_by: req.user.id,
  });

  res.status(201).json({
    message: "Sortie de déchets créée avec succès",
    disposal_id: waste.id,
    waste,
    // disposal_number: disposal_number,
  });
};

export const updateWaste = async (req: Request, res: Response) => {

  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);

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


export const deleteWaste = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id)
  const toDelete = await WasteDisposal.findByPk(id)
  if (!toDelete) throw new createHttpError[404]("Sortie de déchets non trouvée");
  await toDelete.destroy()

  res.json({ message: "Sortie de déchets supprimée avec succès" });
};


export const wasteStats = async (req: Request, res: Response) => {
  const filterSchema = z.object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  });
  const filter = filterSchema.parse(req.query);

  const where: WhereOptions<Attributes<WasteDisposal>> = {};
  const dateRange = formatWhereDateRange(filter.date_from, filter.date_to);
  if (dateRange) where.disposal_date = dateRange;

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


export const wasteStatsCategory = async (req: Request, res: Response) => {
  const data = z.object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional()
  })
  const { date_from, date_to } = data.parse(req.query);

  const where: WhereOptions<Attributes<WasteDisposal>> = {};
  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.disposal_date = dateRange;


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
