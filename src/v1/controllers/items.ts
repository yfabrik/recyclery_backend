import createHttpError from "http-errors";
import { Op, type Attributes, type WhereOptions } from "sequelize";
import z from "zod";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import type { Request, Response } from "express";
import LabeledItem from "../../models/labeleditem.js";
import Category from "../../models/category.js";
import User from "../../models/user.js";

const dataSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish().prefault(null),
  category_id: idSchema("categorie requis"),
  subcategory_id: idSchema().nullish().prefault(null),
  weight: z.coerce.number().nonnegative("poid requis").default(0),
  price: z.coerce.number().nonnegative("prix requis"),
  cost: z.coerce.number().nonnegative().nullish().prefault(null),
  condition_state: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  location: z.string().nullish(),
  arrival_id: idSchema().nullish(),
  purchase_price: z.coerce.number().nonnegative().nullish(),
  selling_price: z.coerce.number().nonnegative().nullish(),
  recyclery_id: idSchema().nullish().prefault(null),
});


export const listLabeledItem = async (req: Request, res: Response) => {
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

  const where: WhereOptions<Attributes<LabeledItem>> = likeQuery
    ? {
      ...filter,
      [Op.or]: [
        // { name: likeQuery },
        { description: likeQuery },
        { id: likeQuery },
      ],
    }
    : { ...filter };
  const pagination = {} as { limit: number, offset: number };
  if (page) ((pagination.limit = 50), (pagination.offset = (page - 1) * 50));

  const labeledItems = await LabeledItem.findAndCountAll({
    where,
    distinct: true,
    col: "id",
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


export const createLabeledItem = async (req: Request & { user: User }, res: Response) => {
  const data = dataSchema.parse(req.body);

  const category = await Category.findByPk(data.category_id);
  const sub = data.subcategory_id != null
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

export const updateItem = async (req: Request & { user: User }, res: Response) => {
  const id = idSchema().parse(req.params.id)

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


export const deleteLabeledItem = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id)
  const toDelete = await LabeledItem.findByPk(id)

  if (!toDelete) throw new createHttpError[404]("Article non trouvé");
  await toDelete.destroy()

  res.json({ success: true, message: "Article supprimé avec succès" });
};

export const tagItemAsSell = async (req: Request & { user: User }, res: Response) => {
  const id = idSchema().parse(req.params.id)
  const item = await LabeledItem.findByPk(id)
  if (!item || item.status == "available") throw new createHttpError[404]("Article non trouvé");
  await item.update({
    status: "sold",
    // sold_at: new Date()
  })


  res.json({ success: true, message: "Article marqué comme vendu" });
};
