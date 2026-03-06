import createHttpError from "http-errors";
import { literal, Op } from "sequelize";
import * as z from "zod";
import db from "../../models/index.js";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
const { Category, Promotion } = db;

const dataSchema = z.object({
  name: z.string("Le nom est requis"),
  description: z.string().nullish(),
  icon: z.string().nullish(), //TODO should be enum with list of icon
  parent_id: idSchema().nullish().default(null),
  defaultWeight: z.number().nonnegative().default(0),
  defaultPrice: z.number().nonnegative().default(0),
  priceBasedOnWeight: z.boolean().default(false),
  bundleQuantity: z.coerce.number().int().nonnegative().nullish(),
  bundlePrice: z.coerce.number().nonnegative().nullish(),
});

const IOValues = {
  IN: 1 << 1,
  OUT: 1 << 0,
  SELL: 1 << 2,
};
/**
 *
 * @param {string} name
 * @param {number|null} parent_id
 * @returns
 */
const findExistingCategory = async (name, parent_id = null) => {
  return await Category.findOne({
    where: { [Op.and]: [{ name: name }, { parent_id: parent_id }] },
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCategories = async (req, res) => {
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
  });
  const filters = filtersSchema.parse(req.query);

  /**
   * @type {import("sequelize").Filterable<import("../../models/types/categoryModel.js").CategoryAttributes>['where']}
   */
  const where = {};
  /**
   * @type {import("sequelize"). FindOptions<import("../../models/types/categoryModel.js").CategoryAttributes>["include"]}
   */
  const include = [];
  if (filters.only_category) where.parent_id = { [Op.is]: null };
  if (filters.only_sub) {
    where.parent_id = { [Op.not]: null };
  }

  const includePromo = {
    model: Promotion,
    where: {
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() },
      isActive: true
    },
    required: false
  }
  if (filters.include.includes("promo")) {
    include.push({ ...includePromo })
  }

  if (filters.in) where.IO = literal(`Category.IO & ${IOValues.IN} != 0`);
  if (filters.out) where.IO = literal(`Category.IO & ${IOValues.OUT} != 0`);
  if (filters.sell) where.IO = literal(`Category.IO & ${IOValues.SELL} != 0`);

  if (filters.include.includes("category")) {
    const insideWhere = {};
    if (typeof filters.in == "boolean" && filters.in)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.IN} != 0`);
    if (typeof filters.out == "boolean" && filters.out)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.OUT} != 0`);
    if (typeof filters.sell == "boolean" && filters.sell)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.SELL} != 0`);
    const insideInclude = []
    if (filters.include.includes("promo"))//TODO PK ça marche pas ?
      insideInclude.push({ ...includePromo })
    include.push({
      model: Category,
      as: "subcategories",
      where: { ...insideWhere },
      include: insideInclude,
      required: false,
    });
  }
  if (filters.include.includes("parent")) {
    const insideWhere = {};
    if (typeof filters.in == "boolean" && filters.in)
      insideWhere.IO = literal(`parent.IO & ${IOValues.IN} != 0`);
    if (typeof filters.out == "boolean" && filters.out)
      insideWhere.IO = literal(`parent.IO & ${IOValues.OUT} != 0`);
    if (typeof filters.sell == "boolean" && filters.sell)
      insideWhere.IO = literal(`subcategories.IO & ${IOValues.SELL} != 0`);
    const insideInclude = []
    if (filters.include.includes("promo"))
      insideInclude.push({ ...includePromo })
    include.push({
      model: Category,
      as: "parent",
      required: false,
      where: { ...insideWhere },
      include: insideInclude,
    });
  }

  const categories = await Category.findAll({ where, include });

  res.json({
    success: true,
    categories,
  });
};
/**
 *
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

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createCategorie = async (req, res) => {
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
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteCategorie = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const deleted = await Category.destroy({ where: { id } });
  if (deleted == 0) throw new createHttpError[404]("Catégorie non trouvée");
  res.json({
    success: true,
    message: "Catégorie supprimée avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateCategorie = async (req, res) => {
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

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const patchCategory = async (req, res) => {
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
