import createHttpError from "http-errors";
import db from "../../models/index.js";

import { Op } from "sequelize";
import z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";

const { LabeledItem, Category, User } = db;

const dataSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
  category_id: idSchema("categorie requis"),
  subcategory_id: idSchema().nullish(),
  weight: z.coerce.number().nonnegative().nullish(),
  price: z.coerce.number().nonnegative("prix requis"),
  cost: z.coerce.number().nonnegative().nullish(),
  condition_state: z.enum(["excellent", "good", "fair", "poor"]).nullish(),
  location: z.string().nullish(),
  arrival_id: idSchema().nullish(),
  purchase_price: z.coerce.number().nonnegative().nullish(),
  selling_price: z.coerce.number().nonnegative().nullish(),
  recyclery_id: idSchema().nullish(),
});

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listLabeledItem = async (req, res) => {
  const filterSchema = z.object({
    status: z.string().optional(),
    category_id: idSchema().optional(),
    search: z.string().optional(),
    recyclery_id: idSchema().optional(),
    barcode: idSchema().optional(), //TODO verifier
    page: z.coerce.number().positive().optional(),
  });
  const { search, page, ...filter } = filterSchema.parse(req.query);
  const likeQuery = search ? { [Op.like]: `%${search}%` } : null;
  /** @type {import("sequelize").WhereOptions<import("../../models/types/labeledItemModel.js").LabeledItemAttributes>} */
  const where = likeQuery
    ? {
        ...filter,
        [Op.or]: [
          { name: likeQuery },
          { description: likeQuery },
          { barcode: likeQuery },
        ],
      }
    : { ...filter };
  const pagination = {};
  if (page) ((pagination.limit = 50), (pagination.offset = (page - 1) * 50));

  const labeledItems = await LabeledItem.findAndCountAll({
    where,
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
      },
      {
        model: Category,
        as: "subcategory",
        attributes: ["id", "name"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["id", "username"],
      },
    ],
    order: [["createdAt", "DESC"]],
    ...pagination,
  });

  res.json({
    success: true,
    items: labeledItems.rows,
    total: labeledItems.count,
  });
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const getItemFromBarcode = async (req, res) => {
  logger.warn("used getItemFromBarcode TO REMOVE");
  const { barcode } = req.params;
  const item = await LabeledItem.findOne({ where: { id: +barcode } });

  if (!item) throw new createHttpError[404]("Article non trouvé"); //TODO barcode as query param

  res.json({ success: true, item });
};

/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const createLabeledItem = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const category = await Category.findByPk(data.category_id);
  const sub =
    data.subcategory_id != null
      ? await Category.findByPk(data.subcategory_id)
      : data.subcategory_id;
  if (!data.name) {
    data.name = category ? category.name : "Article";
    if (sub) data.name += `> ${sub.name}`;
  }
  const item = await LabeledItem.create({
    ...data,
    created_by: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Article créé avec succès",
    item,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateItem = async (req, res) => {
  const { id } = req.params;

  const data = dataSchema.parse(req.body);

  const item = await LabeledItem.findByPk(id);
  if (!item) throw new createHttpError[404]("item non trouvé");
  await item.update({
    ...data,
    condition_state: data.condition_state ?? item.condition_state,
    weight: data.weight ?? item.weight,
  });

  res.json({ success: true, message: "Article mis à jour avec succès" });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteLabeledItem = async (req, res) => {
  const { id } = req.params;
  const deleted = await LabeledItem.destroy({ where: { id } });

  if (deleted === 0) throw new createHttpError[404]("Article non trouvé");

  res.json({ success: true, message: "Article supprimé avec succès" });
};
/**
 *
 * @param {import("../../middlewares/auth.js").RequestWithUser} req
 * @param {import("express").Response} res
 */
export const tagItemAsSell = async (req, res) => {
  const { id } = req.params;
  const updated = await LabeledItem.update(
    {
      status: "sold",
      sold_at: new Date(),
      // sold_by: req.user.id,//TODO needed ? peut retrouvé depuis transaction
    },
    {
      where: {
        id,
        status: "available",
      },
    },
  );

  res.json({ success: true, message: "Article marqué comme vendu" });
};
