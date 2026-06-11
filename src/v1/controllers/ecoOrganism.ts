import createHttpError from "http-errors";
import { col, fn, literal, Op, type Includeable } from "sequelize";
import z from "zod";

import type { Request, Response } from "express";
import { idSchema, phoneSchema } from "../../services/zod.js";

import type { ModelWhere } from "../../models/db-types.js";
import db from "../../models/index.js";

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
// export const listActiveEcoOrganism = async (req, res) => {
//   logger.warn("use list active eco organise TO REMOVE");
//   req.query.active = "true";
//   return listEcoOrganism(req, res);
//   // const eco_organisms = await EcoOrganism.findAll({ where: { is_active } });

//   // res.json({ eco_organisms });
// };

export const detailEcoOrganism = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const eco_organism = await EcoOrganism.findByPk(id);

  if (!eco_organism) throw new createHttpError[404]("Éco-organisme non trouvé");

  res.json({ eco_organism });
};

export const createEcoOrganism = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  const { inCategories, sellCategories, ...ecoData } = data;

  const created = await db.sequelize.transaction(async (t) => {
    const eco = await EcoOrganism.create(ecoData, { transaction: t });
    await eco.setInCategories(inCategories, { transaction: t });
    await eco.setSellCategories(sellCategories, { transaction: t });
    return eco;
  });
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
  const { inCategories, sellCategories, ...ecoData } = data;
  await db.sequelize.transaction(async (t) => {
    await eco_organism.update(ecoData, { transaction: t });
    await eco_organism.setInCategories(inCategories, { transaction: t });
    await eco_organism.setSellCategories(sellCategories, { transaction: t });
  });
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
type EcoOrgId = InstanceType<typeof EcoOrganism>["id"];
type ArrivalSourceType = InstanceType<typeof Arrival>["source_type"];

type QuarterRange = {
  start: Date;
  end: Date;
  label: quarterLabel;
  labelMMYYYY: string;
};

type WeightedCategory = {
  id: InstanceType<typeof Category>["id"];
  name: InstanceType<typeof Category>["name"];
  weight_kg: number;
};

type QuarterCategoryBreakdown = {
  total_weight_kg: number;
  categories: (WeightedCategory & {
    subcategories: WeightedCategory[];
  })[];
  labelMMYYYY?: string;
};

type QuarterInBreakdown = QuarterCategoryBreakdown & {
  by_source_type: Record<ArrivalSourceType, QuarterCategoryBreakdown>;
};

type SellCategoryBreakdown = Omit<WeightedCategory, "weight_kg"> & {
  weight_kg: number;
  quantity: number;
  subcategories: (WeightedCategory & { quantity: number })[];
};

type QuarterSellBreakdown = {
  total_weight_kg: number;
  quantity: number;
  categories: SellCategoryBreakdown[];
};

type QuarterOutByEcoOrgMap = Map<EcoOrgId, Record<quarterLabel, QuarterCategoryBreakdown>>;
type QuarterInByEcoOrgMap = Map<EcoOrgId, Record<quarterLabel, QuarterInBreakdown>>;
type QuarterSellByEcoOrgMap = Map<EcoOrgId, Record<quarterLabel, QuarterSellBreakdown>>;

type EcoOrgQuarterStatsResponse = Pick<
  InstanceType<typeof EcoOrganism>,
  "id" | "name" | "description" | "is_active"
> & {
  quarters: {
    quarter: quarterLabel;
    quarterOut: QuarterCategoryBreakdown;
    quarterIn: QuarterInBreakdown;
    quarterSell: QuarterSellBreakdown;
  }[];
};

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

  const quarterRanges: QuarterRange[] = [];
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
    const quarterNumber = (Math.floor(quarterStart.getMonth() / 3) + 1) as
      | 1
      | 2
      | 3
      | 4;
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

type WasteQuarterRow = {
  eco_organism_id: NonNullable<
    InstanceType<typeof WasteDisposal>["eco_organism_id"]
  >;
  category_id: InstanceType<typeof WasteDisposal>["category_id"];
  subcategory_id: InstanceType<typeof WasteDisposal>["subcategory_id"] | null;
  category_name: string;
  subcategory_name: string | null;
  weight_kg: number; // SUM(DECIMAL) usually comes back as string in Sequelize
};

type arrivalQuarterRow = Omit<WasteQuarterRow, "eco_organism_id"> & {
  source_type: InstanceType<typeof Arrival>["source_type"];
};

type sellQuarterRow = Omit<WasteQuarterRow, "eco_organism_id"> & {
  quantity: number;
};

export const getQuarterStatOut = async (
  quarterRanges: QuarterRange[],
): Promise<QuarterOutByEcoOrgMap> => {
  const weightByEcoOrgByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = (await WasteDisposal.findAll({
        attributes: [
          "eco_organism_id",
          "category_id",
          "subcategory_id",
          [col("category.name"), "category_name"],
          [col("subcategory.name"), "subcategory_name"],
          [fn("SUM", col("weight_kg")), "weight_kg"],
        ],
        where: {
          eco_organism_id: { [Op.ne]: null },
          disposal_date: { [Op.between]: [range.start, range.end] },
        },
        include: [
          { model: Category, as: "category", required: false },
          { model: Category, as: "subcategory", required: false },
        ],
        group: ["eco_organism_id", "category_id", "subcategory_id"],
        raw: true,
      })) as unknown as WasteQuarterRow[];

      let byEcoOrg = new Map<EcoOrgId, Record<quarterLabel, QuarterCategoryBreakdown>>();

      for (const row of rows) {
        const ecoOrgId = row.eco_organism_id;
        if (!byEcoOrg.has(ecoOrgId)) {
          byEcoOrg.set(ecoOrgId, {
            [range.label]: { total_weight_kg: 0, categories: [] },
          });
        }
        const ecoOrg = byEcoOrg.get(ecoOrgId)![range.label]!;
        ecoOrg.total_weight_kg += row.weight_kg;
        const cat = ecoOrg.categories.find((c) => c.id === row.category_id);
        if (!cat) {
          const subcategories = row.subcategory_id
            ? ([
                {
                  id: row.subcategory_id,
                  name: row.subcategory_name,
                  weight_kg: row.weight_kg,
                },
              ] as WeightedCategory[])
            : ([] as WeightedCategory[]);
          ecoOrg.categories.push({
            id: row.category_id,
            name: row.category_name,
            weight_kg: row.weight_kg,
            subcategories,
          });
        } else {
          cat.weight_kg += row.weight_kg;
          const sub = cat?.subcategories.find(
            (c) => c.id === row.subcategory_id,
          );
          if (!sub) {
            cat?.subcategories.push({
              id: row.subcategory_id!,
              name: row.subcategory_name!,
              weight_kg: row.weight_kg,
            });
          } else {
            sub.weight_kg += row.weight_kg;
          }
        }
      }
      return byEcoOrg;
    }),
  );
  const quarterDataByEcoOrg = new Map<
    EcoOrgId,
    Record<quarterLabel, QuarterCategoryBreakdown>
  >();

  for (const perQuarterMap of weightByEcoOrgByQuarter) {
    for (const [ecoOrgId, quarterData] of perQuarterMap.entries()) {
      const currentData =
        quarterDataByEcoOrg.get(ecoOrgId) ??
        ({} as Record<quarterLabel, QuarterCategoryBreakdown>);
      quarterDataByEcoOrg.set(ecoOrgId, { ...currentData, ...quarterData });
    }
  }

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
  quarterRanges: QuarterRange[],
  // ecoOrganisms: InstanceType<typeof EcoOrganism>[],
): Promise<QuarterInByEcoOrgMap> => {
  //all eco org avec leur incategories
  const inCategoryLinks = await EcoOrganism.findAll({
    attributes: ["id"],
    include: [{ model: Category, as: "inCategories" }],
  });

  //trouve tout les arrivals pour la range donné
  // les group par source type ,categorie, subcategorie et fait la somme des poids
  const arrivalBySourceByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = (await Arrival.findAll({
        attributes: [
          "source_type",
          "category_id",
          "subcategory_id",
          [col("categorie.name"), "category_name"],
          [col("subcategorie.name"), "subcategory_name"],
          [fn("SUM", col("weight")), "weight_kg"],
        ],
        where: {
          arrival_date: { [Op.between]: [range.start, range.end] },
          // category_id:{[Op.in]:}
        },
        include: [
          { model: Category, as: "categorie", required: true },
          { model: Category, as: "subcategorie" },
        ],
        group: ["source_type", "category_id", "subcategory_id"],
        raw: true,
      })) as unknown as arrivalQuarterRow[];
      return {
        label: range.label,
        rows,
      };
    }),
  );

  //passe d'un array a un map pour arrivals
  const arrivalRowsByQuarterLabel = new Map(
    arrivalBySourceByQuarter.map((q) => [q.label, q.rows]),
  );

  const byEcoOrg = new Map() as QuarterInByEcoOrgMap;
  for (const ecoOrg of inCategoryLinks) {
    const quarterRecord = {} as Record<quarterLabel, QuarterInBreakdown>;
    for (const range of quarterRanges) {
      quarterRecord[range.label] = {
        total_weight_kg: 0,
        categories:
          ecoOrg.inCategories?.map((c) => ({
            id: c.id,
            name: c.name,
            weight_kg: 0,
            subcategories: [],
          })) ?? [],
        by_source_type: {
          point: {
            total_weight_kg: 0,
            categories: [],
          },
          apport: {
            total_weight_kg: 0,
            categories: [],
          },
          house_clearance: {
            total_weight_kg: 0,
            categories: [],
          },
        },
      };
    }
    byEcoOrg.set(ecoOrg.id, quarterRecord);
  }

  for (const [_ecoOrgId, quarterData] of byEcoOrg) {
    for (const [label, quarter] of Object.entries(quarterData) as [
      quarterLabel,
      QuarterInBreakdown,
    ][]) {
      arrivalRowsByQuarterLabel.get(label)?.forEach((row) => {
        const catId = row.category_id;
        const cat = quarter.categories.find((c) => c.id === catId);
        if (!cat) return; // categorie pas trouvé donc fait pas parti des in cat
        quarter.total_weight_kg += row.weight_kg;
        cat.weight_kg += row.weight_kg;

        const subcatId = row.subcategory_id;
        if (subcatId != null) {
          const sub = cat.subcategories.find((c) => c.id === subcatId);
          if (sub) {
            sub.weight_kg += row.weight_kg;
          } else {
            cat.subcategories.push({
              id: subcatId,
              name: row.subcategory_name!,
              weight_kg: row.weight_kg,
            });
          }
        }
        const sourceType = row.source_type;
        if (sourceType != null) {
          const sourceTypeRecord = quarter.by_source_type[sourceType];
          sourceTypeRecord.total_weight_kg += row.weight_kg;
          const category = sourceTypeRecord.categories.find(
            (c) => c.id === catId,
          );
          if (category) {
            category.weight_kg += row.weight_kg;
          } else {
            sourceTypeRecord.categories.push({
              id: catId,
              name: row.category_name,
              weight_kg: row.weight_kg,
              subcategories: [],
            });
          }
          if (subcatId != null) {
            const subcat = category?.subcategories.find(
              (c) => c.id === subcatId,
            );
            if (subcat) {
              subcat.weight_kg += row.weight_kg;
            } else {
              category?.subcategories.push({
                id: subcatId,
                name: row.subcategory_name!,
                weight_kg: row.weight_kg,
              });
            }
          }
        }
      });
    }
  }

  return byEcoOrg;
};

export const getQuarterStatSell = async (
  quarterRanges: QuarterRange[],
): Promise<QuarterSellByEcoOrgMap> => {
  const sellCategoryLinks = await EcoOrganism.findAll({
    attributes: ["id"],
    include: [{ model: Category, as: "sellCategories" }],
  });

  const soldQuantityByQuarter = await Promise.all(
    quarterRanges.map(async (range) => {
      const rows = (await TransactionItem.findAll({
        attributes: [
          [col("LabeledItem.category_id"), "category_id"],
          [col("LabeledItem.subcategory_id"), "subcategory_id"],
          [col("LabeledItem.category.name"), "category_name"],
          [col("LabeledItem.subcategory.name"), "subcategory_name"],
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
            include: [
              { model: Category, as: "category", required: true },
              { model: Category, as: "subcategory" },
            ],
            where: { status: "sold" },
          },
        ],
        group: [
          col("LabeledItem.category_id"),
          col("LabeledItem.subcategory_id"),
        ],
        raw: true,
      })) as unknown as sellQuarterRow[];
      return {
        label: range.label,
        rows,
      };
    }),
  );

  const soldQuantityRowsByQuarterLabel = new Map(
    soldQuantityByQuarter.map((q) => [q.label, q.rows]),
  );

  const byEcoOrg = new Map() as QuarterSellByEcoOrgMap;
  for (const ecoOrg of sellCategoryLinks) {
    const quarterRecord = {} as Record<
      quarterLabel,
      QuarterSellBreakdown
    >;
    for (const range of quarterRanges) {
      quarterRecord[range.label] = {
        total_weight_kg: 0,
        quantity: 0,
        categories:
          ecoOrg.sellCategories?.map((c) => ({
            id: c.id,
            name: c.name,
            weight_kg: 0,
            subcategories: [],
            quantity: 0,
          })) ?? [],
      };
    }
    byEcoOrg.set(ecoOrg.id, quarterRecord);
  }

  for (const [_ecoOrgId, quarterData] of byEcoOrg) {
    for (const [label, quarter] of Object.entries(quarterData) as [
      quarterLabel,
      QuarterSellBreakdown,
    ][]) {
      soldQuantityRowsByQuarterLabel.get(label)?.forEach((row) => {
        const catId = row.category_id;
        const category = quarter.categories.find((c) => c.id === catId);
        if (!category) return; // categorie pas trouvé donc fait pas parti des sell cat
        quarter.total_weight_kg += row.weight_kg;
        category.weight_kg += row.weight_kg;

        const subcatId = row.subcategory_id;
        if (subcatId != null) {
          const sub = category.subcategories.find((c) => c.id === subcatId);
          if (sub) {
            sub.weight_kg += row.weight_kg;
            sub.quantity += row.quantity;
          } else {
            category.subcategories.push({
              id: subcatId,
              name: row.subcategory_name!,
              weight_kg: row.weight_kg,
              quantity: row.quantity,
            });
          }
        }
      });
    }
  }

  return byEcoOrg;
};

export const ecoOrgaStats = async (_req: Request, res: Response) => {
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

export const ecoOrgQuarterStats = async (_req: Request, res: Response) => {
  const quarterRanges = quartersDateRanges(new Date());
  // Fetch all eco organisms (we want the full list with quarters, including those with 0 waste)
  const ecoOrganisms = await EcoOrganism.findAll({
    where: { is_active: true },
    attributes: ["id", "name", "description", "is_active"],
  });

  const [quarterOutByEcoOrg, quarterInByEcoOrg, quarterSellByEcoOrg] =
    await Promise.all([
      getQuarterStatOut(quarterRanges),
      getQuarterStatIn(quarterRanges),
      getQuarterStatSell(quarterRanges),
    ]);

  const response = ecoOrganisms.map((eo) => {
    return {
      id: eo.id,
      name: eo.name,
      description: eo.description,
      is_active: eo.is_active,
      quarters: quarterRanges.map((range) => {
        return {
          quarter: range.label,
          quarterOut: quarterOutByEcoOrg.get(eo.id)?.[range.label] ?? {},
          quarterIn: quarterInByEcoOrg.get(eo.id)?.[range.label] ?? {},
          quarterSell: quarterSellByEcoOrg.get(eo.id)?.[range.label] ?? {},
        };
      }),
    };
  }) as Array<EcoOrgQuarterStatsResponse>;

  return res.json({ stats: response });
};
