import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { col, fn, literal, Op } from "sequelize";
import z from "zod";
import { CONDITION_STATES } from "../../constants/dbEnums.js";
import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../services/pagination.js";
import { enumSchema, idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";

import db from "../../models/index.js";
import type { ModelWhere, RequestWithUser } from "./types.js";

const { LabeledItem, Category, User } = db;

const dataSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish().prefault(null),
  category_id: idSchema("categorie requis"),
  subcategory_id: idSchema().nullish().prefault(null),
  weight: z.coerce.number().nonnegative("poid requis").default(0),
  price: z.coerce.number().nonnegative("prix requis"),
  cost: z.coerce.number().nonnegative().nullish().prefault(null),
  condition_state: enumSchema(CONDITION_STATES).optional(),
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
  });
  const { search, ...filter } = filterSchema.parse(req.query);
  const pagination = parsePaginationQuery(req.query);
  const likeQuery = search ? { [Op.like]: `%${search}%` } : null;

  const where: ModelWhere<typeof LabeledItem> = likeQuery
    ? {
        ...filter,
        [Op.or]: [
          // { name: likeQuery },
          { description: likeQuery },
          { id: likeQuery },
        ],
      }
    : { ...filter };
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
    ...(pagination.paginated
      ? { limit: pagination.limit, offset: pagination.offset }
      : {}),
  });

  res.json({
    success: true,
    items: labeledItems.rows,
    pagination: pagination.paginated
      ? buildPaginationMeta(
          pagination.page,
          pagination.perPage,
          labeledItems.count,
        )
      : buildUnpaginatedMeta(labeledItems.count),
  });
};
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const getItemFromBarcode = async (req: Request, res: Response) => {
  const barcode = idSchema().parse(req.params.barcode);
  const item = await LabeledItem.findOne({ where: { id: barcode } });

  if (!item) throw new createHttpError[404]("Article non trouvé");
  res.json({ success: true, item });
};

export const createLabeledItem = async (
  req: RequestWithUser,
  res: Response,
) => {
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

export const updateItem = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  const item = await findByPkOrThrow(LabeledItem, id, "item non trouvé");
  await item.update({
    ...data,
    condition_state: data.condition_state ?? item.condition_state,
    weight: data.weight ?? item.weight,
  });

  res.json({ success: true, message: "Article mis à jour avec succès" });
};

export const deleteLabeledItem = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const toDelete = await findByPkOrThrow(LabeledItem, id, "Article non trouvé");
  await toDelete.destroy();

  res.json({ success: true, message: "Article supprimé avec succès" });
};

export const tagItemAsSell = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const item = await findByPkOrThrow(LabeledItem, id, "Article non trouvé");
  if (item.status == "available")
    throw new createHttpError[404]("Article non trouvé");
  await item.update({
    status: "sold",
    // sold_at: new Date()
  });

  res.json({ success: true, message: "Article marqué comme vendu" });
};

export const itemsStats = async (req: Request, res: Response) => {
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

  const where: ModelWhere<typeof LabeledItem> = likeQuery
    ? {
        ...filter,
        [Op.or]: [
          // { name: likeQuery },
          { description: likeQuery },
          { id: likeQuery },
        ],
      }
    : { ...filter };

  const stats = await LabeledItem.findAll({
    attributes: [
      [fn("COUNT", col("*")), "total_items"],
      [
        fn("SUM", literal(`CASE WHEN status = 'available' THEN 1 ELSE 0 END`)),
        "available_items",
      ],
      [
        fn("SUM", literal(`CASE WHEN status = 'sold' THEN 1 ELSE 0 END`)),
        "sold_items",
      ],
      [
        fn("SUM", literal(`CASE WHEN status = 'reserved' THEN 1 ELSE 0 END`)),
        "reserved_items",
      ],
      [fn("SUM", col("price")), "total_value"],
    ],
    where,
  });

  res.json({
    success: true,
    stats: stats[0],
  });
};
