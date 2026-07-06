import createHttpError from "http-errors";
import { literal, Op, type Includeable } from "sequelize";
import {
  categoryDataSchema,
  categoryListFilterSchema,
  categoryPatchSchema,
} from "@recyclerie/api/schemas/categories";
import type {
  CreateCategoryResponse,
  DeleteCategoryResponse,
  ListCategoriesResponse,
  PatchCategoryResponse,
  UpdateCategoryResponse,
} from "@recyclerie/api/responses/categories";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { toCategoryDto } from "../../mappers/categories.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere, Models } from "../../models/db-types.js";
import { IOValues } from "../../constants/categoryIO.js";

const { Category, Recyclery, Promotion } = db;

const findExistingCategory = async (
  name: string,
  parent_id: number | null = null,
) => {
  return await Category.findOne({
    where: { [Op.and]: [{ name: name }, { parent_id: parent_id }] },
  });
};

const filterPromotionsForStore = (
  category: Models["Category"],
  storeId: Models["Recyclery"]["id"],
) => {
  if (!category || typeof category !== "object") return;

  if (Array.isArray(category.Promotions)) {
    category.Promotions = category.Promotions.filter((promotion) => {
      const stores = Array.isArray(promotion?.stores) ? promotion.stores : [];
      return (
        stores.length === 0 || stores.some((store) => store.id === storeId)
      );
    }).map((promotion) => {
      if (promotion && typeof promotion === "object") {
        delete promotion.stores;
      }
      return promotion;
    });
  }

  if (Array.isArray(category.subcategories)) {
    category.subcategories.forEach((subcat) =>
      filterPromotionsForStore(subcat, storeId),
    );
  }

  if (category.parent && typeof category.parent === "object") {
    filterPromotionsForStore(category.parent, storeId);
  }
};

export const listCategories = async (req: Request, res: Response) => {
  const filters = categoryListFilterSchema.parse(req.query);

  const where: ModelWhere<typeof Category> = {};

  const include: Includeable[] = [];
  if (filters.only_category) where.parent_id = { [Op.is]: null };
  if (filters.only_sub) {
    where.parent_id = { [Op.not]: null };
  }

  const includePromo = {
    model: Promotion,
    where: {
      startDate: { [Op.or]: [{ [Op.is]: null }, { [Op.lte]: new Date() }] },
      endDate: { [Op.or]: [{ [Op.is]: null }, { [Op.gte]: new Date() }] },
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

  //TODO can do better
  if (filters.in) where.IO = literal(`Category.IO & ${IOValues.IN} != 0`);
  if (filters.out) where.IO = literal(`Category.IO & ${IOValues.OUT} != 0`);
  if (filters.sell) where.IO = literal(`Category.IO & ${IOValues.SELL} != 0`);

  if (filters.include.includes("category")) {
    const insideWhere: ModelWhere<typeof Category> = {};
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
    const insideWhere: ModelWhere<typeof Category> = {};
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

  res.json(
    apiData(categories.map(toCategoryDto)) satisfies ListCategoriesResponse,
  );
};

export const createCategorie = async (req: Request, res: Response) => {
  const data = categoryDataSchema.parse(req.body);
  const existingCategory = await findExistingCategory(
    data.name,
    data.parent_id,
  );

  if (existingCategory)
    throw new createHttpError[404]("Une catégorie avec ce nom existe déjà"); //TODO hook

  const category = await Category.create({
    ...data,
  });

  res.status(201).json(
    apiCreated(toCategoryDto(category), {
      message: "Catégorie créée avec succès",
    }) satisfies CreateCategoryResponse,
  );
};

export const deleteCategorie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const toDelete = await findByPkOrThrow(Category, id, "Catégorie non trouvée");
  await toDelete.destroy();
  res.json(
    apiMessage("Catégorie supprimée avec succès") satisfies DeleteCategoryResponse,
  );
};

export const updateCategorie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = categoryDataSchema.parse(req.body);

  const category = await findByPkOrThrow(Category, id, "Catégorie non trouvée");

  const existingCategory = await findExistingCategory(
    data.name,
    category.parent_id,
  );

  if (existingCategory && existingCategory.id != category.id)
    throw new createHttpError[404]("Une catégorie avec ce nom existe déjà"); //TODO make hook

  await category.update({
    ...data,
  });

  res.json(
    apiData(toCategoryDto(category), {
      message: "Catégorie mise à jour avec succès",
    }) satisfies UpdateCategoryResponse,
  );
};

export const patchCategory = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = categoryPatchSchema.parse(req.body);
  const category = await findByPkOrThrow(Category, id, "categorie non trouvé", {
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
  const parent = category?.parent;
  const subcategories = category?.subcategories;
  //TODO can do better
  await db.sequelize.transaction(async (t) => {
    if (typeof data.in == "boolean")
      if (data.in) {
        category.IO |= IOValues.IN;
        if (parent) {
          parent.IO |= IOValues.IN;
          await parent.save({ transaction: t });
        }
      } else {
        category.IO &= ~IOValues.IN;
        if (subcategories?.length) {
          await Promise.all(
            subcategories.map(async (cat) => {
              cat.IO &= ~IOValues.IN;
              await cat.save({ transaction: t });
            }),
          );
        }
      }
    if (typeof data.out == "boolean")
      if (data.out) {
        category.IO |= IOValues.OUT;
        if (parent) {
          parent.IO |= IOValues.OUT;
          await parent.save({ transaction: t });
        }
      } else {
        category.IO &= ~IOValues.OUT;
        if (subcategories?.length) {
          await Promise.all(
            subcategories.map(async (cat) => {
              cat.IO &= ~IOValues.OUT;
              await cat.save({ transaction: t });
            }),
          );
        }
      }

    if (typeof data.sell == "boolean")
      if (data.sell) {
        category.IO |= IOValues.SELL;
        if (parent) {
          parent.IO |= IOValues.SELL;
          await parent.save({ transaction: t });
        }
      } else {
        category.IO &= ~IOValues.SELL;
        if (subcategories?.length) {
          await Promise.all(
            subcategories.map(async (cat) => {
              cat.IO &= ~IOValues.SELL;
              await cat.save({ transaction: t });
            }),
          );
        }
      }

    await category.save({ transaction: t });
  });
  res.json(
    apiMessage("Catégorie mise à jour avec succès") satisfies PatchCategoryResponse,
  );
};
