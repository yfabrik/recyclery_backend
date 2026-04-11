import createHttpError from "http-errors";
import {
  literal,
  Op,
  type Attributes,
  type Includeable,
  type WhereOptions,
} from "sequelize";
import * as z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import Category from "../../models/category.js";
import Recyclery from "../../models/recyclery.js";
import type { Request, Response } from "express";
import Promotion from "../../models/promotion.js";

const dataSchema = z.object({
  name: z.string("Le nom est requis"),
  description: z.string().nullish().prefault(null),
  icon: z.string().nullish().prefault(null), //TODO should be enum with list of icon
  parent_id: idSchema().nullish().prefault(null),
  defaultWeight: z.number().nonnegative().prefault(0),
  defaultPrice: z.number().nonnegative().prefault(0),
  priceBasedOnWeight: z.boolean().prefault(false),
  bundleQuantity: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullish()
    .prefault(null),
  bundlePrice: z.coerce.number().nonnegative().nullish().prefault(null),
});

const IOValues = {
  IN: 1 << 1,
  OUT: 1 << 0,
  SELL: 1 << 2,
};

const findExistingCategory = async (
  name: string,
  parent_id: number | null = null,
) => {
  return await Category.findOne({
    where: { [Op.and]: [{ name: name }, { parent_id: parent_id }] },
  });
};

/**
 * Keep promotions that are either:
 * - global (no linked stores), or
 * - linked to the requested store.
 * Also removes the internal `stores` include from response payload.
 *
 * @param {any} category
 * @param {number} storeId
 */
const filterPromotionsForStore = (
  category: Category,
  storeId: Recyclery["id"],
) => {
  if (!category || typeof category !== "object") return;

  if (Array.isArray(category.Promotions)) {
    category.Promotions = category.Promotions.filter(
      /** @param {{ stores?: Array<{ id: number }> }} promotion */
      (promotion) => {
        const stores = Array.isArray(promotion?.stores) ? promotion.stores : [];
        return (
          stores.length === 0 ||
          stores.some(
            /** @param {{ id: number }} store */ (store) =>
              store.id === storeId,
          )
        );
      },
    ).map(
      /** @param {{ stores?: Array<{ id: number }> }} promotion */ (
        promotion,
      ) => {
        if (promotion && typeof promotion === "object") {
          delete promotion.stores;
        }
        return promotion;
      },
    );
  }

  if (Array.isArray(category.subcategories)) {
    category.subcategories.forEach(
      /** @param {any} subcat */ (subcat) =>
        filterPromotionsForStore(subcat, storeId),
    );
  }

  if (category.parent && typeof category.parent === "object") {
    filterPromotionsForStore(category.parent, storeId);
  }
};

export const listCategories = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["category", "parent", "promo"];
  const filtersSchema = z.object({
    include: z
      .string()
      .toLowerCase()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
    only_category: z.coerce.boolean().optional().default(false),
    only_sub: z.coerce.boolean().optional().default(false),
    out: z.coerce.boolean().optional(),
    in: z.coerce.boolean().optional(),
    sell: z.coerce.boolean().optional(),
    store_id: idSchema().optional(),
  });
  const filters = filtersSchema.parse(req.query);

  const where: WhereOptions<Attributes<Category>> = {};

  const include: Includeable[] = [];
  if (filters.only_category) where.parent_id = { [Op.is]: null };
  if (filters.only_sub) {
    where.parent_id = { [Op.not]: null };
  }

  const includePromo = {
    model: Promotion,
    where: {
      // startDate: { [Op.lte]: new Date() },
      // endDate: { [Op.gte]: new Date() },
      isActive: true,
    },
    required: false,
    include: filters.store_id
      ? [
          {
            model: Recyclery,
            as: "stores",
            attributes: ["id"],
            through: { attributes: [] },
            required: false,
          },
        ]
      : [],
  };
  if (filters.include.includes("promo")) {
    include.push({ ...includePromo });
  }

  if (filters.in) where.IO = literal(`Category.IO & ${IOValues.IN} != 0`);
  if (filters.out) where.IO = literal(`Category.IO & ${IOValues.OUT} != 0`);
  if (filters.sell) where.IO = literal(`Category.IO & ${IOValues.SELL} != 0`);

  if (filters.include.includes("category")) {
    const insideWhere: WhereOptions<Attributes<Category>> = {};
    if (typeof filters.in == "boolean" && filters.in)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.IN} != 0`);
    if (typeof filters.out == "boolean" && filters.out)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.OUT} != 0`);
    if (typeof filters.sell == "boolean" && filters.sell)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.SELL} != 0`);
    const insideInclude = [];
    if (filters.include.includes("promo"))
      //TODO PK ça marche pas ?
      insideInclude.push({ ...includePromo });
    include.push({
      model: Category,
      as: "subcategories",
      where: { ...insideWhere },
      include: insideInclude,
      required: false,
      order: [["name", "ASC"]],
    });
  }
  if (filters.include.includes("parent")) {
    const insideWhere: WhereOptions<Attributes<Category>> = {};
    if (typeof filters.in == "boolean" && filters.in)
      insideWhere.IO = literal(`parent.IO & ${IOValues.IN} != 0`);
    if (typeof filters.out == "boolean" && filters.out)
      insideWhere.IO = literal(`parent.IO & ${IOValues.OUT} != 0`);
    if (typeof filters.sell == "boolean" && filters.sell)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.SELL} != 0`);
    const insideInclude = [];
    if (filters.include.includes("promo"))
      insideInclude.push({ ...includePromo });
    include.push({
      model: Category,
      as: "parent",
      required: false,
      where: { ...insideWhere },
      include: insideInclude,
    });
  }

  let categories = await Category.findAll({
    where,
    include,
    order: [["name", "ASC"]],
  });
  const storeId = filters.store_id;
  if (typeof storeId === "number" && filters.include.includes("promo")) {
    categories = categories.map((category) => category.toJSON());
    categories.forEach((category) =>
      filterPromotionsForStore(category, storeId),
    );
  }

  res.json({
    success: true,
    categories,
  });
};
/**
 *@deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listSubcategories = async (req, res) => {
  logger.info("called list subcategorie REMAKE");
  const subcategories = await Category.findAll({
    where: { parent_id: { [Op.gt]: 0 } },
  });

  res.json({
    success: true,
    subcategories,
  });
};

export const createCategorie = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
  // Vérifier si la catégorie existe déjà
  const existingCategory = await findExistingCategory(
    data.name,
    data.parent_id,
  );

  if (existingCategory)
    throw new createHttpError[404]("Une catégorie avec ce nom existe déjà"); //TODO hook

  const category = await Category.create({
    ...data,
  });

  res.status(201).json({
    success: true,
    message: "Catégorie créée avec succès",
    category,
  });
};

export const deleteCategorie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const toDelete = await Category.findByPk(id);
  if (!toDelete) throw new createHttpError[404]("Catégorie non trouvée");
  await toDelete.destroy();
  res.json({
    success: true,
    message: "Catégorie supprimée avec succès",
  });
};

export const updateCategorie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);

  const category = await Category.findByPk(id);

  // Vérifier si la catégorie existe
  if (!category) throw new createHttpError[404]("Catégorie non trouvée");

  // Vérifier si le nouveau nom n'est pas déjà utilisé
  const existingCategory = await findExistingCategory(
    data.name,
    category.parent_id,
  );

  if (existingCategory && existingCategory.id != category.id)
    throw new createHttpError[404]("Une catégorie avec ce nom existe déjà"); //TODO make hook

  await category.update({
    ...data,
  });

  res.json({
    success: true,
    message: "Catégorie mise à jour avec succès",
    category,
  });
};

export const patchCategory = async (req: Request, res: Response) => {
  const dataSchema = z.object({
    in: z.boolean().optional(),
    out: z.boolean().optional(),
    sell: z.boolean().optional(),
  });
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);
  const category = await Category.findByPk(id, {
    include: [
      {
        model: Category,
        as: "parent",
      },
      {
        model: Category,
        as: "subcategories",
      },
    ],
  });

  if (!category) throw new createHttpError.NotFound("categorie non trouvé");
  const parent = category?.parent;
  const subcategories = category?.subcategories;

  if (typeof data.in == "boolean")
    if (data.in) {
      category.IO |= IOValues.IN;
      if (parent) {
        parent.IO |= IOValues.IN;
        await parent.save();
      }
    } else {
      category.IO &= ~IOValues.IN;
      subcategories?.map(async (cat) => {
        cat.IO &= ~IOValues.IN;
        await cat.save();
      });
    }
  if (typeof data.out == "boolean")
    if (data.out) {
      category.IO |= IOValues.OUT;
      if (parent) {
        parent.IO |= IOValues.OUT;
        await parent.save();
      }
    } else {
      category.IO &= ~IOValues.OUT;
      subcategories?.map(async (cat) => {
        cat.IO &= ~IOValues.OUT;
        await cat.save();
      });
    }

  if (typeof data.sell == "boolean")
    if (data.sell) {
      category.IO |= IOValues.SELL;
      if (parent) {
        parent.IO |= IOValues.SELL;
        await parent.save();
      }
    } else {
      category.IO &= ~IOValues.SELL;
      subcategories?.map(async (cat) => {
        cat.IO &= ~IOValues.SELL;
        await cat.save();
      });
    }

  // data.in ? (category.IO |= IOValues.IN) : (category.IO &= ~IOValues.IN);
  // if (typeof data.out == "boolean")
  //   data.out ? (category.IO |= IOValues.OUT) : (category.IO &= ~IOValues.OUT);

  await category.save();
  res.json({
    success: true,
    message: "Catégorie mise à jour avec succès",
  });
};
