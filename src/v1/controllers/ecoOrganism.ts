import createHttpError from "http-errors";
import {
  col,
  fn,
  literal,
  Op,

  type Includeable,

} from "sequelize";
import z from "zod";

import logger from "../../services/logger.js";
import { idSchema, phoneSchema } from "../../services/zod.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere } from "../../models/db-types.js";

const {
  EcoOrganism,
  WasteDisposal,
  Category,
  Arrival,
  TransactionItem,
  SalesTransaction,
  LabeledItem,
} = db;

const dataSchema = z.object({
  name: z.string().trim().nonempty("Le nom est requis"),
  description: z.string().nullish().prefault(null),
  contact_email: z.email().nullish().prefault(null),
  contact_phone: phoneSchema().nullish().prefault(null),
  address: z.string().nullish().prefault(null),
  website: z.url().nullish().prefault(null),
  is_active: z.boolean().optional().default(true),
  inCategories: z.array(idSchema()).optional().default([]),
  sellCategories: z.array(idSchema()).optional().default([]),
});

export const listEcoOrganism = async (req: Request, res: Response) => {
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

  const where: ModelWhere<typeof EcoOrganism> = {};
  if (filter.active) where.is_active = filter.active;
  const include: Includeable[] = [];
  if (filter.include.includes("waste")) include.push({ model: WasteDisposal });
  if (filter.include.includes("incategories"))
    include.push({ model: Category, as: "inCategories" });
  if (filter.include.includes("sellcategories"))
    include.push({ model: Category, as: "sellCategories" });
  const eco_organisms = await EcoOrganism.findAll({ where, include });

  res.json({ eco_organisms });
};
/**
 * @deprecated
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

export const detailEcoOrganism = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const eco_organism = await EcoOrganism.findByPk(id);

  if (!eco_organism) throw new createHttpError[404]("Éco-organisme non trouvé");

  res.json({ eco_organism });
};

export const createEcoOrganism = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);

  const created = await EcoOrganism.create({
    ...data,
  });
  await created.setInCategories(data.inCategories);
  await created.setSellCategories(data.sellCategories);
  res.status(201).json({
    message: "Éco-organisme créé avec succès",
    eco_organism_id: created.id,
  });
};

export const updateEcoOrganism = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  const eco_organism = await EcoOrganism.findByPk(id);
  if (!eco_organism) throw new createHttpError[404]("eco organisme pas trouvé");
  await eco_organism.update({
    ...data,
  });
  await eco_organism.setInCategories(data.inCategories);
  await eco_organism.setSellCategories(data.sellCategories);
  res.json({ message: "Éco-organisme mis à jour avec succès", eco_organism });
};

export const deleteEcoOrganism = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const ecoOrg = await EcoOrganism.findByPk(id);
  if (!ecoOrg) throw new createHttpError.NotFound("organisme pas trouvé");

  // const waste = await ecoOrg.countWasteDisposals() //TODO

  const waste = await WasteDisposal.count({ where: { eco_organism_id: id } });

  // Check if eco-organism is used in waste disposals

  if (waste > 0) {
    // If used in waste disposals, deactivate instead of delete
    await ecoOrg.update({ is_active: false });
    res.json({ message: "Éco-organisme désactivé avec succès" });
  } else {
    await ecoOrg.destroy();
    // If not used, delete permanently
    res.json({ message: "Éco-organisme supprimé avec succès" });
  }
};

type quarterLabel = `${number}-T${1 | 2 | 3 | 4}`;
export const quartersDateRanges = (startDate: Date, quarterCount = 4) => {
  // Normalize to local midnight to avoid timezone drift
  const normalizedStartDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const currentQuarterIndex = Math.floor(normalizedStartDate.getMonth() / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4

  const quarterRanges = [] as {
    start: Date;
    end: Date;
    label: quarterLabel;
    labelMMYYYY: string;
  }[];
  for (let i = 0; i < quarterCount; i++) {
    const quarterStart = new Date(
      normalizedStartDate.getFullYear(),
      currentQuarterIndex * 3 - i * 3,
      1,
      0,
      0,
      0,
      0,
    );
    const quarterEnd =
      i === 0
        ? new Date(
            normalizedStartDate.getFullYear(),
            normalizedStartDate.getMonth(),
            normalizedStartDate.getDate(),
            23,
            59,
            59,
            999,
          )
        : new Date(
            quarterStart.getFullYear(),
            quarterStart.getMonth() + 3,
            0,
            23,
            59,
            59,
            999,
          );

    const year = quarterStart.getFullYear();
    const quarterNumber = Math.floor(quarterStart.getMonth() / 3) + 1;
    const startMonth = quarterStart.getMonth() + 1;
    const endMonth = startMonth + 2;
    quarterRanges.push({
      start: quarterStart,
      end: quarterEnd,
      label: `${year}-T${quarterNumber}`,
      labelMMYYYY: `${String(startMonth).padStart(2, "0")}-${year}--${String(endMonth).padStart(2, "0")}-${year}`,
    });
  }

  return quarterRanges;
};

type cat = { id: Category["id"]; name: Category["name"]; weight_kg: number };
type s = {
  total_weight_kg: number;
  categories: (cat & { subcategories: cat[] })[];
  labelMMYYYY: string;
};

type categories = s["categories"];

export const getQuarterStatOut = async (
  quarterRanges: {
    start: Date;
    end: Date;
    label: quarterLabel;
    labelMMYYYY: string;
  }[],
) => {
  const weightByEcoOrgByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = await WasteDisposal.findAll({
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
        // raw: true,
      });
      console.log(rows);

      return {
        label: range.label,
        labelMMYYYY: range.labelMMYYYY,
        rows,
      };
    }),
  );

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

  const categoryMap = new Map() as Map<
    Category["id"],
    Pick<Category, "id" | "name">
  >;
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

  const quarterDataByEcoOrg = new Map() as Map<
    WasteDisposal["eco_organism_id"],
    Record<quarterLabel, s>
  >;

  weightByEcoOrgByQuarter.forEach(({ label, labelMMYYYY, rows }) => {
    const byEcoOrg = new Map() as Map<
      WasteDisposal["eco_organism_id"],
      Omit<s, "labelMMYYYY">
    >;
    rows.forEach((r) => {
      const id = r.eco_organism_id;
      if (!byEcoOrg.has(id)) {
        byEcoOrg.set(id, { total_weight_kg: 0, categories: [] });
      }
      const rec = byEcoOrg.get(id)!;
      const weight = r.weight_kg ?? 0;
      rec.total_weight_kg += weight;
      const catId = r.category_id;
      if (catId != null) {
        let category = rec.categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? "",
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
            name: subcat?.name ?? "",
            weight_kg: weight,
          });
        }
      }
    });
    byEcoOrg.forEach((data, id) => {
      if (!quarterDataByEcoOrg.has(id)) quarterDataByEcoOrg.set(id, {});
      quarterDataByEcoOrg.get(id)![label] = {
        ...data,
        labelMMYYYY,
      };
    });
  });
  return quarterDataByEcoOrg;
};

/**
 * trouve  tout les ecoorg avec leur incategories
 * fait un map du result on passe d'un array [ecoorg with cat]=>{ecoId,[cat[]]}
 * trouve tout les arrival et group par source ,cat et sub, + poid total
 * extrait les cat des arrivals
 * fait un map cat id=> name,id
 * arrivals => to map range=> arrivals
 * pour chaque ecoOrg
 *    pour chaque range
 *      on trouve les info des arrivage
 *        pour chaque arrivage
 *          on ajoute le poid de l'arrival pour la categorie et les sous categorie
 *        pour chaque arrivage
 *          on fait la meme chose mais on filter pour chaque source_type(point,apport,videmaison)
 *        return total weight +les 2 loop pour chaque arrivage
 *
 * @param quarterRanges
 * @param ecoOrganisms
 */
export const getQuarterStatIn = async (
  quarterRanges: {
    start: Date;
    end: Date;
    label: quarterLabel;
    labelMMYYYY: string;
  }[],
  ecoOrganisms: EcoOrganism[],
) => {
  //all eco org avec leur incategories
  const inCategoryLinks = await EcoOrganism.findAll({
    attributes: ["id"],
    include: [{ model: Category, as: "inCategories" }],
  });

  //transform incategoryLink [eocorgx:{id,inCategories:[{Category,...}]}]
  //to  map [ecoorgId:[categoriesId:[]]]
  const inCategoryIdsByEcoOrg: Map<
    EcoOrganism["id"],
    Set<Category["id"]>
  > = new Map();
  inCategoryLinks.forEach((link) => {
    if (!inCategoryIdsByEcoOrg.has(link.id)) {
      inCategoryIdsByEcoOrg.set(link.id, new Set());
    }
    (link.inCategories ?? []).forEach((c) =>
      inCategoryIdsByEcoOrg.get(link.id)!.add(c.id),
    );
  });

  //trouve tout les arrivals pour la range donné
  // les group par source type ,categorie, subcategorie et fait la somme des poids
  const arrivalBySourceByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = await Arrival.findAll({
        attributes: [
          "source_type",
          "category_id",
          "subcategory_id",
          [fn("SUM", col("weight")), "weight_kg"],
        ],
        where: {
          arrival_date: { [Op.between]: [range.start, range.end] },
          // category_id:{[Op.in]:}
        },
        group: ["source_type", "category_id", "subcategory_id"],
        raw: true,
      });
      return {
        label: range.label,
        rows,
      };
    }),
  );
  //trouve les categories des arrivals d'avant
  const arrivalCategoryIds = [
    ...new Set(
      arrivalBySourceByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.category_id).filter((id) => id != null),
      ),
    ),
  ];
  const arrivalSubcategoryIds = [
    ...new Set(
      arrivalBySourceByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.subcategory_id).filter((id) => id != null),
      ),
    ),
  ];
  const allCategoryIds = [
    ...new Set([...arrivalCategoryIds, ...arrivalSubcategoryIds]),
  ];

  //fait un map des categories categorieID =>category Name
  const categoryMap = new Map() as Map<
    Category["id"],
    Pick<Category, "id" | "name">
  >;
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

  //passe d'un array a un map pour arrivals
  const arrivalRowsByQuarterLabel = new Map(
    arrivalBySourceByQuarter.map((q) => [q.label, q.rows]),
  );

  //pour chaque ecoorg
  const eco_organisms = ecoOrganisms.map((eo) => {
    //incategorielink
    //trouve les categorie pour un ecoorg
    const inCategoryIds = inCategoryIdsByEcoOrg.get(eo.id) ?? new Set();

    //enlever des categories pas autorisé ?????
    const filterCategoriesByAllowedIds = (
      categories: categories,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      return categories.filter((c) => allowedCategoryIds.has(c.id));
    };

    //fait le total du poid pour les categories filtré
    const buildFilteredQuarter = (
      data: categories,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const filteredCategories = filterCategoriesByAllowedIds(
        data?.categories ?? [],
        allowedCategoryIds,
      );
      return {
        total_weight_kg: filteredCategories.reduce(
          (sum, category) => sum + Number(category.weight_kg ?? 0),
          0,
        ),
        categories: filteredCategories,
      };
    };

    //make les {weight, categories:[]} de chaque quarter
    const buildQuarterFromArrivalRows = (
      rows: Arrival[],
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const categories = [] as categories;
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const weight = r.weight_kg ?? 0;
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? "",
            weight_kg: 0,
            subcategories: [],
          };
          categories.push(category);
        }
        category.weight_kg += weight;
        const subcatId = r.subcategory_id;
        if (subcatId != null) {
          const subcat = categoryMap.get(subcatId);
          category.subcategories.push({
            id: subcatId,
            name: subcat?.name ?? "",
            weight_kg: weight,
          });
        }
      });
      return {
        total_weight_kg: categories.reduce(
          (sum, category) => sum + (category.weight_kg ?? 0),
          0,
        ),
        categories,
      };
    };

    const splitQuarterInBySourceType = (
      rows: Arrival[],
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const sourceTypes = [
        "point",
        "apport",
        "house_clearance",
      ] as const satisfies Arrival["source_type"][];
      return sourceTypes.reduce(
        (acc, sourceType) => {
          acc[sourceType] = buildQuarterFromArrivalRows(
            rows.filter((r) => r.source_type === sourceType),
            allowedCategoryIds,
          );
          return acc;
        },
        {} as Record<Arrival["source_type"], Omit<s, "labelMMYYYY">>,
      );
    };

    const quarterDataByEcoOrg = new Map() as Map<
      WasteDisposal["eco_organism_id"],
      Record<quarterLabel, s>
    >;
    const id = eo.id;
    const byEcoOrg = new Map() as Map<
      WasteDisposal["eco_organism_id"],
      Omit<s, "labelMMYYYY">
    >;
    const quarters = quarterRanges.map((range) => {
      const data = quarterDataByEcoOrg.get(id)?.[range.label];
      const arrivalRows = arrivalRowsByQuarterLabel.get(range.label) ?? [];
      const quarterInData = buildQuarterFromArrivalRows(
        arrivalRows,
        inCategoryIds,
      );
      const quarterInBySourceType = splitQuarterInBySourceType(
        arrivalRows,
        inCategoryIds,
      );

      return {
        quarter: range.label,
        label: range.labelMMYYYY,
        total_weight_kg: data?.total_weight_kg ?? 0,
        categories: data?.categories ?? [],

        quarterIn: {
          total_weight_kg: quarterInData.total_weight_kg,
          categories: quarterInData.categories,
          by_source_type: quarterInBySourceType,
        },
      };
    });
    return {
      ...eo.toJSON(),
      quarters,
    };
  });
};

export const getQuarterStatSell = async (
  quarterRanges: {
    start: Date;
    end: Date;
    label: `${number}-T${1 | 2 | 3 | 4}`;
    labelMMYYYY: string;
  }[],
) => {
  const sellCategoryLinks = await EcoOrganism.findAll({
    attributes: ["id"],
    include: [{ model: Category, as: "sellCategories" }],
  });

  const sellCategoryIdsByEcoOrg: Map<number, Set<number>> = new Map();
  sellCategoryLinks.forEach((link) => {
    if (!sellCategoryIdsByEcoOrg.has(link.id)) {
      sellCategoryIdsByEcoOrg.set(link.id, new Set());
    }
    (link.sellCategories ?? []).forEach((c) =>
      sellCategoryIdsByEcoOrg.get(link.id)!.add(c.id),
    );
  });

  const soldQuantityByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = await TransactionItem.findAll({
        attributes: [
          [col("LabeledItem.category_id"), "category_id"],
          [col("LabeledItem.subcategory_id"), "subcategory_id"],
          [fn("SUM", col("TransactionItem.quantity")), "quantity"],
          [
            fn(
              "SUM",
              literal(
                "COALESCE(CAST(LabeledItem.weight AS REAL), 0) * COALESCE(TransactionItem.quantity, 0)",
              ),
            ),
            "weight_kg",
          ],
        ],
        include: [
          {
            model: SalesTransaction,
            required: true,
            attributes: [],
            where: {
              createdAt: { [Op.between]: [range.start, range.end] },
              transactionType: "sell",
            },
          },
          {
            model: LabeledItem,
            required: true,
            attributes: [],
            where: { status: "sold" },
          },
        ],
        group: [
          col("LabeledItem.category_id"),
          col("LabeledItem.subcategory_id"),
        ],
        raw: true,
      });
      return {
        label: range.label,
        rows,
      };
    }),
  );

  const soldCategoryIds = [
    ...new Set(
      soldQuantityByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.category_id).filter((id) => id != null),
      ),
    ),
  ];
  const soldSubcategoryIds = [
    ...new Set(
      soldQuantityByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.subcategory_id).filter((id) => id != null),
      ),
    ),
  ];

  const allCategoryIds = [
    ...new Set([...soldCategoryIds, ...soldSubcategoryIds]),
  ];
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

  const soldQuantityRowsByQuarterLabel = new Map(
    soldQuantityByQuarter.map((q) => [q.label, q.rows]),
  );
  // Ensure every eco organism has 4 quarters (0 / [] for quarters with no waste)
  const eco_organisms = ecoOrganisms.map((eo) => {
    const sellCategoryIds = sellCategoryIdsByEcoOrg.get(eo.id) ?? new Set();

    const filterCategoriesByAllowedIds = (
      categories: categories,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      return categories.filter((c) => allowedCategoryIds.has(c.id));
    };

    const buildFilteredQuarter = (
      data: Omit<s, "labelMMYYYY">,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const filteredCategories = filterCategoriesByAllowedIds(
        data?.categories ?? [],
        allowedCategoryIds,
      );
      return {
        total_weight_kg: filteredCategories.reduce(
          (sum, category) => sum + Number(category.weight_kg ?? 0),
          0,
        ),
        categories: filteredCategories,
      };
    };

    //SELL PART
    /**
     * @param {{ category_id: number | null; subcategory_id: number | null; quantity: string | number; weight_kg?: string | number }[]} rows
     * @param {Set<number>} allowedCategoryIds
     */
    const buildQuarterSellQuantity = (
      rows: {
        category_id: number | null;
        subcategory_id: number | null;
        quantity: string | number;
        weight_kg?: string | number;
      }[],
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      /** @type {{ id: number; name: string | null; quantity: number; subcategories: { id: number; name: string | null; quantity: number }[] }[]} */
      const categories = [];
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const quantity = Number(r.quantity ?? 0);
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            quantity: 0,
            subcategories: [],
          };
          categories.push(category);
        }
        category.quantity += quantity;
        const subcatId = r.subcategory_id;
        if (subcatId != null) {
          const subcat = categoryMap.get(subcatId);
          category.subcategories.push({
            id: subcatId,
            name: subcat?.name ?? null,
            quantity,
          });
        }
      });
      return {
        quantity: categories.reduce(
          (sum, category) => sum + Number(category.quantity ?? 0),
          0,
        ),
        categories,
      };
    };

    /**
     * @param {{ category_id: number | null; subcategory_id: number | null; quantity: string | number; weight_kg?: string | number }[]} rows
     * @param {Set<number>} allowedCategoryIds
     */
    const buildQuarterSellFromSoldRows = (
      rows,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      /** @type {{ id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[]} */
      const categories = [];
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const weight = Number(r.weight_kg ?? 0);
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            weight_kg: 0,
            subcategories: [],
          };
          categories.push(category);
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
      });
      return {
        total_weight_kg: categories.reduce(
          (sum, c) => sum + Number(c.weight_kg ?? 0),
          0,
        ),
        categories,
      };
    };
    const id = eo.id;
    const quarters = quarterRanges.map((range) => {
      const data = quarterDataByEcoOrg.get(id)?.[range.label];

      const soldQuantityRows =
        soldQuantityRowsByQuarterLabel.get(range.label) ?? [];
      const quarterSellData = buildQuarterSellFromSoldRows(
        soldQuantityRows,
        sellCategoryIds,
      );
      const quarterSellQuantityData = buildQuarterSellQuantity(
        soldQuantityRows,
        sellCategoryIds,
      );
      const quarterSellCategoriesById = new Map(
        quarterSellData.categories.map((category) => [
          category.id,
          {
            ...category,
            quantity:
              quarterSellQuantityData.categories.find(
                (c) => c.id === category.id,
              )?.quantity ?? 0,
            subcategories: category.subcategories.map((subcat) => ({
              ...subcat,
              quantity:
                quarterSellQuantityData.categories
                  .find((c) => c.id === category.id)
                  ?.subcategories.find((s) => s.id === subcat.id)?.quantity ??
                0,
            })),
          },
        ]),
      );
      return {
        quarter: range.label,
        label: range.labelMMYYYY,
        total_weight_kg: data?.total_weight_kg ?? 0,
        categories: data?.categories ?? [],

        quarterSell: {
          total_weight_kg: quarterSellData.total_weight_kg,
          quantity: quarterSellQuantityData.quantity,
          categories: quarterSellData.categories.map(
            (category) =>
              quarterSellCategoriesById.get(category.id) ?? category,
          ),
        },
      };
    });
    return {
      ...eo.toJSON(),
      quarters,
    };
  });
};

export const ecoOrgaStats = async (req: Request, res: Response) => {
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

export const ecoOrgQuarterStats = async (req: Request, res: Response) => {
  /**
   * TODO
   * 1 get current time
   * 2 get start of the quarter
   * 3 set to midnight
   * 4 get end of the previous ( remove 1s)
   * 5 loop( take date => find end of quarter, find start of quarter , find end of previous quarter)
   */

  const quarterRanges = quartersDateRanges(new Date());
  // Fetch all eco organisms (we want the full list with quarters, including those with 0 waste)
  const ecoOrganisms = await EcoOrganism.findAll({
    where: { is_active: true },
    attributes: ["id", "name", "description", "is_active"],
  });

  // /**
  //  * Read category links from a pivot table and normalize output keys.
  //  * Supports either snake_case columns or Sequelize default naming.
  //  * @param {"ecoOrg_categoryIn" | "ecoOrg_categorySell"} tableName
  //  */
  // const loadEcoOrgCategoryLinks = async (tableName) => {
  //   const columns =
  //     /** @type {{ name: string }[]} */ (
  //       await db.sequelize.query(`PRAGMA table_info("${tableName}")`, {
  //         type: db.Sequelize.QueryTypes.SELECT,
  //       })
  //     );
  //   const columnNames = new Set(columns.map((c) => c.name));

  //   const ecoOrgColumn =
  //     ["eco_organism_id", "EcoOrganismId", "ecoOrganismId"].find((c) =>
  //       columnNames.has(c),
  //     ) ?? null;
  //   const categoryColumn =
  //     ["category_id", "CategoryId", "categoryId"].find((c) =>
  //       columnNames.has(c),
  //     ) ?? null;

  //   if (!ecoOrgColumn || !categoryColumn) return [];

  //   return /** @type {{ eco_organism_id: number; category_id: number }[]} */ (
  //     await db.sequelize.query(
  //       `SELECT "${ecoOrgColumn}" as eco_organism_id, "${categoryColumn}" as category_id FROM "${tableName}"`,
  //       {
  //         type: db.Sequelize.QueryTypes.SELECT,
  //       },
  //     )
  //   );
  // };

  const [inCategoryLinks, sellCategoryLinks] = await Promise.all([
    EcoOrganism.findAll({
      attributes: ["id"],
      include: [{ model: Category, as: "inCategories" }],
    }),
    EcoOrganism.findAll({
      attributes: ["id"],
      include: [{ model: Category, as: "sellCategories" }],
    }),
    // loadEcoOrgCategoryLinks("ecoOrg_categoryIn"),
    // loadEcoOrgCategoryLinks("ecoOrg_categorySell"),
  ]);

  const inCategoryIdsByEcoOrg: Map<number, Set<number>> = new Map();
  inCategoryLinks.forEach((link) => {
    if (!inCategoryIdsByEcoOrg.has(link.id)) {
      inCategoryIdsByEcoOrg.set(link.id, new Set());
    }
    (link.inCategories ?? []).forEach((c) =>
      inCategoryIdsByEcoOrg.get(link.id).add(c.id),
    );
  });

  const sellCategoryIdsByEcoOrg: Map<number, Set<number>> = new Map();
  sellCategoryLinks.forEach((link) => {
    if (!sellCategoryIdsByEcoOrg.has(link.id)) {
      sellCategoryIdsByEcoOrg.set(link.id, new Set());
    }
    (link.sellCategories ?? []).forEach((c) =>
      sellCategoryIdsByEcoOrg.get(link.id).add(c.id),
    );
  });

  //OUT PART
  // For each quarter, get weight per eco_organism_id, category and subcategory
  const weightByEcoOrgByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows =
        /** @type {{ eco_organism_id: number; category_id: number | null; subcategory_id: number | null; weight_kg: string | number }[]} */ /** @type {unknown} */ await WasteDisposal.findAll(
          {
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
          },
        );
      return {
        label: range.label,
        labelMMYYYY: range.labelMMYYYY,
        rows,
      };
    }),
  );

  //IN PART
  // For each quarter, get arrivals split by source_type and grouped by category/subcategory
  const arrivalBySourceByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows =
        /** @type {{ source_type: "point" | "apport" | "house_clearance" | null; category_id: number | null; subcategory_id: number | null; weight_kg: string | number }[]} */ /** @type {unknown} */ await Arrival.findAll(
          {
            attributes: [
              "source_type",
              "category_id",
              "subcategory_id",
              [fn("SUM", col("weight")), "weight_kg"],
            ],
            where: {
              arrival_date: { [Op.between]: [range.start, range.end] },
            },
            group: ["source_type", "category_id", "subcategory_id"],
            raw: true,
          },
        );
      return {
        label: range.label,
        rows,
      };
    }),
  );

  //SELL PART
  // For each quarter, get sold quantity grouped by category/subcategory
  const soldQuantityByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows =
        /** @type {{ category_id: number | null; subcategory_id: number | null; quantity: string | number; weight_kg: string | number }[]} */ /** @type {unknown} */ await TransactionItem.findAll(
          {
            attributes: [
              [col("LabeledItem.category_id"), "category_id"],
              [col("LabeledItem.subcategory_id"), "subcategory_id"],
              [fn("SUM", col("TransactionItem.quantity")), "quantity"],
              [
                fn(
                  "SUM",
                  literal(
                    "COALESCE(CAST(LabeledItem.weight AS REAL), 0) * COALESCE(TransactionItem.quantity, 0)",
                  ),
                ),
                "weight_kg",
              ],
            ],
            include: [
              {
                model: SalesTransaction,
                required: true,
                attributes: [],
                where: {
                  createdAt: { [Op.between]: [range.start, range.end] },
                  transactionType: "sell",
                },
              },
              {
                model: LabeledItem,
                required: true,
                attributes: [],
                where: { status: "sold" },
              },
            ],
            group: [
              col("LabeledItem.category_id"),
              col("LabeledItem.subcategory_id"),
            ],
            raw: true,
          },
        );
      return {
        label: range.label,
        rows,
      };
    }),
  );

  //OUT PART
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

  // IN PART
  const arrivalCategoryIds = [
    ...new Set(
      arrivalBySourceByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.category_id).filter((id) => id != null),
      ),
    ),
  ];
  const arrivalSubcategoryIds = [
    ...new Set(
      arrivalBySourceByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.subcategory_id).filter((id) => id != null),
      ),
    ),
  ];

  // SELL PART
  const soldCategoryIds = [
    ...new Set(
      soldQuantityByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.category_id).filter((id) => id != null),
      ),
    ),
  ];
  const soldSubcategoryIds = [
    ...new Set(
      soldQuantityByQuarter.flatMap(({ rows }) =>
        rows.map((r) => r.subcategory_id).filter((id) => id != null),
      ),
    ),
  ];

  const allCategoryIds = [
    ...new Set([
      ...categoryIds,
      ...subcategoryIds,
      ...arrivalCategoryIds,
      ...arrivalSubcategoryIds,
      ...soldCategoryIds,
      ...soldSubcategoryIds,
    ]),
  ];
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
  //OUT PART
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

  //IN PART
  const arrivalRowsByQuarterLabel = new Map(
    arrivalBySourceByQuarter.map((q) => [q.label, q.rows]),
  );
  //SELL PART
  const soldQuantityRowsByQuarterLabel = new Map(
    soldQuantityByQuarter.map((q) => [q.label, q.rows]),
  );

  // Ensure every eco organism has 4 quarters (0 / [] for quarters with no waste)
  const eco_organisms = ecoOrganisms.map((eo) => {
    const inCategoryIds = inCategoryIdsByEcoOrg.get(eo.id) ?? new Set();
    const sellCategoryIds = sellCategoryIdsByEcoOrg.get(eo.id) ?? new Set();

    /**
     * @param {{ id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[]} categories
     * @param {Set<number>} allowedCategoryIds
     */
    const filterCategoriesByAllowedIds = (
      categories: Category[],
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      return categories.filter((c) => allowedCategoryIds.has(c.id));
    };

    /**
     * @param {{ total_weight_kg: number; categories: { id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[] } | undefined} data
     * @param {Set<number>} allowedCategoryIds
     */
    const buildFilteredQuarter = (
      data,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const filteredCategories = filterCategoriesByAllowedIds(
        data?.categories ?? [],
        allowedCategoryIds,
      );
      return {
        total_weight_kg: filteredCategories.reduce(
          (sum, category) => sum + Number(category.weight_kg ?? 0),
          0,
        ),
        categories: filteredCategories,
      };
    };

    //SELL PART
    /**
     * @param {{ category_id: number | null; subcategory_id: number | null; quantity: string | number; weight_kg?: string | number }[]} rows
     * @param {Set<number>} allowedCategoryIds
     */
    const buildQuarterSellQuantity = (
      rows,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      /** @type {{ id: number; name: string | null; quantity: number; subcategories: { id: number; name: string | null; quantity: number }[] }[]} */
      const categories = [];
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const quantity = Number(r.quantity ?? 0);
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            quantity: 0,
            subcategories: [],
          };
          categories.push(category);
        }
        category.quantity += quantity;
        const subcatId = r.subcategory_id;
        if (subcatId != null) {
          const subcat = categoryMap.get(subcatId);
          category.subcategories.push({
            id: subcatId,
            name: subcat?.name ?? null,
            quantity,
          });
        }
      });
      return {
        quantity: categories.reduce(
          (sum, category) => sum + Number(category.quantity ?? 0),
          0,
        ),
        categories,
      };
    };

    /**
     * @param {{ category_id: number | null; subcategory_id: number | null; quantity: string | number; weight_kg?: string | number }[]} rows
     * @param {Set<number>} allowedCategoryIds
     */
    const buildQuarterSellFromSoldRows = (
      rows,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      /** @type {{ id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[]} */
      const categories = [];
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const weight = Number(r.weight_kg ?? 0);
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            weight_kg: 0,
            subcategories: [],
          };
          categories.push(category);
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
      });
      return {
        total_weight_kg: categories.reduce(
          (sum, c) => sum + Number(c.weight_kg ?? 0),
          0,
        ),
        categories,
      };
    };

    //IN PART
    /**
     * @param {{ source_type: "point" | "apport" | "house_clearance" | null; category_id: number | null; subcategory_id: number | null; weight_kg: string | number }[]} rows
     * @param {Set<number>} allowedCategoryIds
     */
    const buildQuarterFromArrivalRows = (
      rows,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      /** @type {{ id: number; name: string | null; weight_kg: number; subcategories: { id: number; name: string | null; weight_kg: number }[] }[]} */
      const categories = [];
      rows.forEach((r) => {
        const catId = r.category_id;
        if (catId == null || !allowedCategoryIds.has(catId)) return;
        const weight = Number(r.weight_kg ?? 0);
        let category = categories.find((c) => c.id === catId);
        if (!category) {
          const cat = categoryMap.get(catId);
          category = {
            id: catId,
            name: cat?.name ?? null,
            weight_kg: 0,
            subcategories: [],
          };
          categories.push(category);
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
      });
      return {
        total_weight_kg: categories.reduce(
          (sum, category) => sum + Number(category.weight_kg ?? 0),
          0,
        ),
        categories,
      };
    };

    const splitQuarterInBySourceType = (
      rows,
      allowedCategoryIds: Set<Category["id"]>,
    ) => {
      const sourceTypes = ["point", "apport", "house_clearance"];
      return sourceTypes.reduce((acc, sourceType) => {
        acc[sourceType] = buildQuarterFromArrivalRows(
          rows.filter((r) => r.source_type === sourceType),
          allowedCategoryIds,
        );
        return acc;
      }, {});
    };

    const id = eo.id;
    const quarters = quarterRanges.map((range) => {
      const data = quarterDataByEcoOrg.get(id)?.[range.label];
      const arrivalRows = arrivalRowsByQuarterLabel.get(range.label) ?? [];
      const quarterInData = buildQuarterFromArrivalRows(
        arrivalRows,
        inCategoryIds,
      );
      const quarterInBySourceType = splitQuarterInBySourceType(
        arrivalRows,
        inCategoryIds,
      );
      const soldQuantityRows =
        soldQuantityRowsByQuarterLabel.get(range.label) ?? [];
      const quarterSellData = buildQuarterSellFromSoldRows(
        soldQuantityRows,
        sellCategoryIds,
      );
      const quarterSellQuantityData = buildQuarterSellQuantity(
        soldQuantityRows,
        sellCategoryIds,
      );
      const quarterSellCategoriesById = new Map(
        quarterSellData.categories.map((category) => [
          category.id,
          {
            ...category,
            quantity:
              quarterSellQuantityData.categories.find(
                (c) => c.id === category.id,
              )?.quantity ?? 0,
            subcategories: category.subcategories.map((subcat) => ({
              ...subcat,
              quantity:
                quarterSellQuantityData.categories
                  .find((c) => c.id === category.id)
                  ?.subcategories.find((s) => s.id === subcat.id)?.quantity ??
                0,
            })),
          },
        ]),
      );
      return {
        quarter: range.label,
        label: range.labelMMYYYY,
        total_weight_kg: data?.total_weight_kg ?? 0,
        categories: data?.categories ?? [],
        quarterOut: {
          total_weight_kg: data?.total_weight_kg ?? 0,
          categories: data?.categories ?? [],
        },
        quarterIn: {
          total_weight_kg: quarterInData.total_weight_kg,
          categories: quarterInData.categories,
          by_source_type: quarterInBySourceType,
        },
        quarterSell: {
          total_weight_kg: quarterSellData.total_weight_kg,
          quantity: quarterSellQuantityData.quantity,
          categories: quarterSellData.categories.map(
            (category) =>
              quarterSellCategoriesById.get(category.id) ?? category,
          ),
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
