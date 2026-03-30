import createHttpError from "http-errors";
import { col, fn, literal, Op } from "sequelize";
import z from "zod";
import db from "../../models/index.js";
import logger from "../../services/logger.js";
import { idSchema, phoneSchema } from "../../services/zod.js";

const { EcoOrganism, WasteDisposal, Category } = db;

const dataSchema = z.object({
  name: z.string().trim().nonempty("Le nom est requis"),
  description: z.string().nullish(),
  contact_email: z.email().nullish(),
  contact_phone: phoneSchema().nullish(),
  address: z.string().nullish(),
  website: z.url().nullish(),
  is_active: z.boolean().optional().default(true),
  inCategories: z.array(idSchema()).optional().default([]),
});

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listEcoOrganism = async (req, res) => {
  const ALLOWED_INCLUDES = ["waste", "incategories", "sellcategories"];
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
  if (filter.include.includes("incategories")) include.push({ model: Category, as: "inCategories" });
  if (filter.include.includes("sellcategories")) include.push({ model: Category, as: "sellCategories" });
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
  await created.setInCategories(data.inCategories);
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
  await eco_organism.setInCategories(data.inCategories);

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
  /**
   * TODO
   * 1 get current time
   * 2 get start of the quarter
   * 3 set to midnight
   * 4 get end of the previous ( remove 1s)
   * 5 loop( take date => find end of quarter, find start of quarter , find end of previous quarter)
   */

  // const quartersMonth = [0, 3, 6, 9];
  const today = new Date();
  // const currentMonth = today.getMonth(); // 0-11
  // const currentYear = today.getFullYear();
  const quarterIndex = Math.floor(today.getMonth() / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4
  const startQuarter = new Date(new Date().setMonth(quarterIndex * 3, 1));
  const dates = [today, new Date(startQuarter)];
  for (let index = 1; index < 4; index++) {
    const tmp = new Date(startQuarter);
    tmp.setMonth(tmp.getMonth() - index * 3);
    tmp.setHours(0, 0, 0, 0);
    dates.push(tmp);
  }
  /** @type {{ start: Date; end: Date; label: string; labelMMYYYY: string }[]} */
  const quarterRanges = dates
    .map((d, index, array) => {
      if (array.length !== index + 1) {
        const p = new Date(new Date(d).setDate(d.getDate() - 1));
        const y = p.getFullYear();
        const q = Math.floor(p.getMonth() / 3);
        const mm = String(p.getMonth() - 1).padStart(2, "0");
        const endMonth = p.getMonth() + 1; // first month of next quarter, so last month of quarter is endMonth - 1
        const mmEnd = String(endMonth).padStart(2, "0"); // 3, 6, 9, 12
        return {
          start: new Date(new Date(array[index + 1]).setHours(0, 0, 0, 0)),
          end: new Date(new Date(p).setHours(23, 59, 59, 999)), //faut enelever 1!jour ?
          label: `${y}-Q${q + 1}`,
          labelMMYYYY: `${mm}-${y}--${mmEnd}-${y}`,
        };
      }
    })
    .filter((f) => f !== undefined);

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

  /**
   * Read category links from a pivot table and normalize output keys.
   * Supports either snake_case columns or Sequelize default naming.
   * @param {"ecoOrg_categoryIn" | "ecoOrg_categorySell"} tableName
   */
  const loadEcoOrgCategoryLinks = async (tableName) => {
    const columns =
      /** @type {{ name: string }[]} */ (
        await db.sequelize.query(`PRAGMA table_info("${tableName}")`, {
          type: db.Sequelize.QueryTypes.SELECT,
        })
      );
    const columnNames = new Set(columns.map((c) => c.name));

    const ecoOrgColumn =
      ["eco_organism_id", "EcoOrganismId", "ecoOrganismId"].find((c) =>
        columnNames.has(c),
      ) ?? null;
    const categoryColumn =
      ["category_id", "CategoryId", "categoryId"].find((c) =>
        columnNames.has(c),
      ) ?? null;

    if (!ecoOrgColumn || !categoryColumn) return [];

    return /** @type {{ eco_organism_id: number; category_id: number }[]} */ (
      await db.sequelize.query(
        `SELECT "${ecoOrgColumn}" as eco_organism_id, "${categoryColumn}" as category_id FROM "${tableName}"`,
        {
          type: db.Sequelize.QueryTypes.SELECT,
        },
      )
    );
  };

  const [inCategoryLinks, sellCategoryLinks] = await Promise.all([
    loadEcoOrgCategoryLinks("ecoOrg_categoryIn"),
    loadEcoOrgCategoryLinks("ecoOrg_categorySell"),
  ]);

  /** @type {Map<number, Set<number>>} */
  const inCategoryIdsByEcoOrg = new Map();
  inCategoryLinks.forEach((link) => {
    if (!inCategoryIdsByEcoOrg.has(link.eco_organism_id)) {
      inCategoryIdsByEcoOrg.set(link.eco_organism_id, new Set());
    }
    inCategoryIdsByEcoOrg.get(link.eco_organism_id).add(link.category_id);
  });

  /** @type {Map<number, Set<number>>} */
  const sellCategoryIdsByEcoOrg = new Map();
  sellCategoryLinks.forEach((link) => {
    if (!sellCategoryIdsByEcoOrg.has(link.eco_organism_id)) {
      sellCategoryIdsByEcoOrg.set(link.eco_organism_id, new Set());
    }
    sellCategoryIdsByEcoOrg.get(link.eco_organism_id).add(link.category_id);
  });

  // For each quarter, get weight per eco_organism_id, category and subcategory
  const weightByEcoOrgByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows =
        /** @type {{ eco_organism_id: number; category_id: number | null; subcategory_id: number | null; weight_kg: string | number }[]} */ (
          /** @type {unknown} */ (
            await WasteDisposal.findAll({
              attributes: [
                "eco_organism_id",
                "category_id",
                "subcategory_id",
                [fn("SUM", col("weight_kg")), "weight_kg"],
              ],
              where: {
                eco_organism_id: { [Op.ne]: null },
                disposal_date: { [Op.between]: [range.start, range.end] },
              },
              group: ["eco_organism_id", "category_id", "subcategory_id"],
              raw: true,
            })
          )
        );
      return {
        label: range.label,
        labelMMYYYY: range.labelMMYYYY,
        rows,
      };
    }),
  );

  // Resolve category/subcategory id -> { id, name } for all ids present in the results
  const categoryIds = [
    ...new Set(
      weightByEcoOrgByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.category_id).filter((id) => id != null),
      ),
    ),
  ];
  const subcategoryIds = [
    ...new Set(
      weightByEcoOrgByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.subcategory_id).filter((id) => id != null),
      ),
    ),
  ];
  const allCategoryIds = [...new Set([...categoryIds, ...subcategoryIds])];
  const categoryMap = new Map();
  if (allCategoryIds.length > 0) {
    const categories = await Category.findAll({
      where: { id: { [Op.in]: allCategoryIds } },
      attributes: ["id", "name"],
      raw: true,
    });
    categories.forEach((c) =>
      categoryMap.set(c.id, { id: c.id, name: c.name }),
    );
  }

  // Build a map: eco_organism_id -> { "2025-Q1": { total_weight_kg, categories: [{ id, name, weight_kg, subcategories }] } }
  const quarterDataByEcoOrg = new Map();
  weightByEcoOrgByQuarter.forEach(({ label, labelMMYYYY, rows }) => {
    const byEcoOrg = new Map();
    rows.forEach((r) => {
      const id = r.eco_organism_id;
      if (!byEcoOrg.has(id)) {
        byEcoOrg.set(id, { total_weight_kg: 0, categories: [] });
      }
      const rec = byEcoOrg.get(id);
      const weight = Number(r.weight_kg ?? 0);
      rec.total_weight_kg += weight;
      const catId = r.category_id;
      if (catId != null) {
        let category = rec.categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            weight_kg: 0,
            subcategories: [],
          };
          rec.categories.push(category);
        }

        category.weight_kg += weight;

        const subcatId = r.subcategory_id;
        if (subcatId != null) {
          const subcat = categoryMap.get(subcatId);
          category.subcategories.push({
            id: subcatId,
            name: subcat?.name ?? null,
            weight_kg: weight,
          });
        }
      }
    });
    byEcoOrg.forEach((data, id) => {
      if (!quarterDataByEcoOrg.has(id)) quarterDataByEcoOrg.set(id, {});
      quarterDataByEcoOrg.get(id)[label] = {
        ...data,
        labelMMYYYY,
      };
    });
  });

  // Ensure every eco organism has 4 quarters (0 / [] for quarters with no waste)
  const eco_organisms = ecoOrganisms.map((eo) => {
    const inCategoryIds = inCategoryIdsByEcoOrg.get(eo.id) ?? new Set();
    const sellCategoryIds = sellCategoryIdsByEcoOrg.get(eo.id) ?? new Set();

    /**
     * @param {{ total_weight_kg: number; categories: { id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[] } | undefined} data
     * @param {Set<number>} allowedCategoryIds
     */
    const buildFilteredQuarter = (data, allowedCategoryIds) => {
      const filteredCategories = (data?.categories ?? []).filter((c) =>
        allowedCategoryIds.has(c.id),
      );
      return {
        total_weight_kg: filteredCategories.reduce(
          (sum, category) => sum + Number(category.weight_kg ?? 0),
          0,
        ),
        categories: filteredCategories,
      };
    };

    const id = eo.id;
    const quarters = quarterRanges.map((range) => {
      const data = quarterDataByEcoOrg.get(id)?.[range.label];
      const quarterInData = buildFilteredQuarter(data, inCategoryIds);
      const quarterSellData = buildFilteredQuarter(data, sellCategoryIds);
      return {
        quarter: range.label,
        label: range.labelMMYYYY,
        total_weight_kg: data?.total_weight_kg ?? 0,
        categories: data?.categories ?? [],
        quarterIn: {
          total_weight_kg: quarterInData.total_weight_kg,
          categories: quarterInData.categories,
        },
        quarterSell: {
          total_weight_kg: quarterSellData.total_weight_kg,
          categories: quarterSellData.categories,
        },
      };
    });
    return {
      ...eo.toJSON(),
      quarters,
    };
  });

  res.json({ stats: eco_organisms });
};
