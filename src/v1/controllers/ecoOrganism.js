import { col, fn, literal, Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import z, { optional } from "zod";
import logger from "../../services/logger.js";
import {
  asOptionalStringWithoutEmpty,
  idSchema,
  nullishToNull,
  phoneSchema,
} from "../../services/zod.js";

const { EcoOrganism, WasteDisposal } = db;

const dataSchema = z.object({
  name: z.string().trim().nonempty("Le nom est requis"),
  description: z.string().nullish(),
  contact_email: z.email().nullish(),
  contact_phone: phoneSchema().nullish(),
  address: z.string().nullish(),
  website: z.url().nullish(),
  is_active: z.boolean().optional().default(true),
});

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listEcoOrganism = async (req, res) => {
  const ALLOWED_INCLUDES = ["waste"];
  const filterSchema = z.object({
    active: z.coerce.boolean().optional(),
    include: z
      .string()
      .toLowerCase()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  });
  const filter = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.active) where.is_active = filter.active;
  const include = [];
  if (filter.include.includes("waste")) include.push({ model: WasteDisposal });

  const eco_organisms = await EcoOrganism.findAll({ where, include });

  res.json({ eco_organisms });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listActiveEcoOrganism = async (req, res) => {
  logger.warn("use list active eco organise TO REMOVE");
  req.query.active = "true";
  return listEcoOrganism(req, res);
  // const eco_organisms = await EcoOrganism.findAll({ where: { is_active } });

  // res.json({ eco_organisms });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailEcoOrganism = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const eco_organism = await EcoOrganism.findByPk(id);

  if (!eco_organism) throw new createHttpError[404]("Éco-organisme non trouvé");

  res.json({ eco_organism });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createEcoOrganism = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const created = await EcoOrganism.create({
    ...data,
  });

  res.status(201).json({
    message: "Éco-organisme créé avec succès",
    eco_organism_id: created.id,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateEcoOrganism = async (req, res) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  const eco_organism = await EcoOrganism.findByPk(id);
  if (!eco_organism) throw new createHttpError[404]("eco organisme pas trouvé");
  await eco_organism.update({
    ...data,
  });

  res.json({ message: "Éco-organisme mis à jour avec succès", eco_organism });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteEcoOrganism = async (req, res) => {
  const { id } = req.params;

  const waste = await WasteDisposal.count({ where: { eco_organism_id: id } });
  // Check if eco-organism is used in waste disposals

  if (waste > 0) {
    // If used in waste disposals, deactivate instead of delete
    await EcoOrganism.update({ is_active: false }, { where: { id } });

    res.json({ message: "Éco-organisme désactivé avec succès" });
  } else {
    const deleted = await EcoOrganism.destroy({ where: { id } });
    // If not used, delete permanently

    if (deleted === 0) {
      return res.status(404).json({ error: "Éco-organisme non trouvé" });
    }
    res.json({ message: "Éco-organisme supprimé avec succès" });
  }
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const ecoOrgaStats = async (req, res) => {
  const stats = await EcoOrganism.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_eco_organisms"],
      [
        fn("SUM", literal(`CASE WHEN "is_active" = 1 THEN 1 ELSE 0 END`)),
        "active_eco_organisms",
      ],
      [
        fn("SUM", literal(`CASE WHEN "is_active" = 0 THEN 1 ELSE 0 END`)),
        "inactive_eco_organisms",
      ],
    ],
  });

  res.json({ stats });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const ecoOrgQuarterStats = async (req, res) => {
  const quartersMonth = [0, 3, 6, 9];
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();
  const quarterIndex = Math.floor(currentMonth / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4
  const startQuarter = new Date(
    new Date().setMonth(quartersMonth[quarterIndex], 1),
  );

  const dates = [today, new Date(startQuarter)];
  for (let index = 1; index < 4; index++) {
    const tmp = new Date(startQuarter);
    tmp.setMonth(tmp.getMonth() - index * 3);
    dates.push(tmp);
  }
  /** @type {{ start: Date; end: Date; label: string; labelMMYYYY: string }[]} */
  const quarterRanges = dates.map((d, index, array) => {
    if (array.length !== index + 1) {
      const y = d.getFullYear();
      const q = Math.floor(d.getMonth() / 3);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const endMonth = d.getMonth() + 3; // first month of next quarter, so last month of quarter is endMonth - 1
      const mmEnd = String(endMonth).padStart(2, "0"); // 3, 6, 9, 12
      return {
        start: new Date(new Date(array[index + 1]).setHours(0, 0, 0, 0)),
        end: new Date(new Date(d).setHours(23, 59, 59, 999)),
        label: `${y}-Q${q + 1}`,
        labelMMYYYY: `${mm}-${y}--${mmEnd}-${y}`,
      };
    }
  }).filter(f=>f!==undefined);

  // for (let i = 0; i < 4; i++) {
  //   const q = (quarterIndex - i + 4) % 4;
  //   const y = currentYear - (quarterIndex - i < 0 ? 1 : 0);
  //   const startMonth = q * 3;
  //   const start = new Date(y, startMonth, 1);
  //   const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999); // last day of quarter
  //   if (i === 0) end.setTime(today.getTime()); // current quarter only up to today
  //   const mm = String(startMonth + 1).padStart(2, "0");
  //   const endMonth = startMonth + 3; // first month of next quarter, so last month of quarter is endMonth - 1
  //   const mmEnd = String(endMonth).padStart(2, "0"); // 3, 6, 9, 12
  //   quarterRanges.push({
  //     start,
  //     end,
  //     label: `${y}-Q${q + 1}`,
  //     labelMMYYYY: `${mm}-${y}--${mmEnd}-${y}`,
  //   });
  // }

  // Fetch all eco organisms (we want the full list with quarters, including those with 0 waste)
  const ecoOrganisms = await EcoOrganism.findAll({
    where: { is_active: true },
    attributes: ["id", "name", "description", "is_active"],
  });

  // For each quarter, get total weight per eco_organism_id
  const weightByEcoOrgByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows =
        /** @type {{ eco_organism_id: number; total_weight_kg: string | number }[]} */ (
          /** @type {unknown} */ (
            await WasteDisposal.findAll({
              attributes: [
                "eco_organism_id",
                [fn("SUM", col("weight_kg")), "total_weight_kg"],
              ],
              where: {
                eco_organism_id: { [Op.ne]: null },
                disposal_date: { [Op.between]: [range.start, range.end] },
              },
              group: ["eco_organism_id"],
              raw: true,
            })
          )
        );
      return { label: range.label, rows };
    }),
  );

  // Build a map: eco_organism_id -> { "2025-Q1": weight, ... }
  const quarterSums = new Map();
  weightByEcoOrgByQuarter.forEach(({ label, rows }) => {
    rows.forEach((r) => {
      const id = r.eco_organism_id;
      if (!quarterSums.has(id)) quarterSums.set(id, {});
      quarterSums.get(id)[label] = Number(r.total_weight_kg ?? 0);
    });
  });

  // Ensure every eco organism has 4 quarters (0 for quarters with no waste)
  const eco_organisms = ecoOrganisms.map((eo) => {
    const id = eo.id;
    const quarters = quarterRanges.map((range) => ({
      quarter: range.label,
      label: range.labelMMYYYY,
      weight_kg: quarterSums.get(id)?.[range.label] ?? 0,
    }));
    return {
      ...eo.toJSON(),
      quarters,
    };
  });

  res.json({ stats:eco_organisms });
};
