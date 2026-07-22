import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { col, fn, literal, Op, type Includeable } from "sequelize";
import {
  labeledItemDataSchema,
  labeledItemFilterSchema,
  labeledItemIncludeSchema,
  labeledItemStatsFilterSchema,
  type LabeledItemIncludeList,
} from "@recyclerie/api/schemas/items";
import type {
  CreateLabeledItemResponse,
  DeleteLabeledItemResponse,
  DetailLabeledItemResponse,
  LabeledItemStatsResponse,
  ListLabeledItemsResponse,
  TagLabeledItemSoldResponse,
  UpdateLabeledItemResponse,
} from "@recyclerie/api/responses/items";
import {
  apiCreated,
  apiData,
  apiMessage,
  apiPaginated,
} from "@recyclerie/api/types/response";
import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../services/pagination.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import {
  toLabeledItemDto,
  toLabeledItemStatsDto,
  type LabeledItemStatsRow,
} from "../../mappers/items.js";

import db from "../../models/index.js";
import type { ModelWhere, RequestWithUser } from "./types.js";
import { formatWhereDateRange } from "../../helpers.js";

const { LabeledItem, Category, User } = db;

const parseItemInclude = (query: Request["query"]): LabeledItemIncludeList =>
  labeledItemIncludeSchema.parse(
    typeof query.include === "string" ? query.include : undefined,
  );

const buildLabeledItemIncludes = (
  include: LabeledItemIncludeList,
): Includeable[] => {
  const expandCategory = include.includes("category.subcategories");

  return [
    expandCategory
      ? {
        model: Category,
        as: "category",
        include: [
          {
            model: Category,
            as: "subcategories",
            attributes: ["id", "name", "parent_id", "description", "icon"],
          },
        ],
      }
      : {
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
  ];
};

export const listLabeledItem = async (req: Request, res: Response) => {
  const { search, include, date_from, date_to, ...filter } =
    labeledItemFilterSchema.parse(req.query);
  const pagination = parsePaginationQuery(req.query);
  const likeQuery = search ? { [Op.like]: `%${search}%` } : null;
  const dateRange = formatWhereDateRange(date_from, date_to);
  const where: ModelWhere<typeof LabeledItem> = likeQuery
    ? {
      ...filter,
      ...(dateRange && { createdAt: dateRange }),
      [Op.or]: [
        { description: likeQuery },
        { id: likeQuery },
      ],
    }
    : { ...filter, ...(dateRange && { createdAt: dateRange }) };
  const labeledItems = await LabeledItem.findAndCountAll({
    where,
    distinct: true,
    col: "id",
    include: buildLabeledItemIncludes(include),
    order: [["createdAt", "DESC"]],
    ...(pagination.paginated
      ? { limit: pagination.limit, offset: pagination.offset }
      : {}),
  });

  res.json(
    apiPaginated(
      labeledItems.rows.map(toLabeledItemDto),
      pagination.paginated
        ? buildPaginationMeta(
          pagination.page,
          pagination.perPage,
          labeledItems.count,
        )
        : buildUnpaginatedMeta(labeledItems.count),
    ) satisfies ListLabeledItemsResponse,
  );
};

export const getItemFromBarcode = async (req: Request, res: Response) => {
  const barcode = idSchema().parse(req.params.barcode);
  const include = parseItemInclude(req.query);
  const item = await LabeledItem.findOne({
    where: { id: barcode },
    include: buildLabeledItemIncludes(include),
  });

  if (!item) throw new createHttpError[404]("Article non trouvé");
  res.json(
    apiData(toLabeledItemDto(item)) satisfies DetailLabeledItemResponse,
  );
};

export const createLabeledItem = async (
  req: RequestWithUser,
  res: Response,
) => {
  const data = labeledItemDataSchema.parse(req.body);

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
  const include = parseItemInclude(req.query);
  if (include.length > 0) {
    await item.reload({ include: buildLabeledItemIncludes(include) });
  }

  res.status(201).json(
    apiCreated(toLabeledItemDto(item), {
      message: "Article créé avec succès",
    }) satisfies CreateLabeledItemResponse,
  );
};

export const updateItem = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = labeledItemDataSchema.parse(req.body);

  const item = await findByPkOrThrow(LabeledItem, id, "item non trouvé");
  await item.update({
    ...data,
    condition_state: data.condition_state ?? item.condition_state,
    weight: data.weight ?? item.weight,
  });
  const include = parseItemInclude(req.query);
  await item.reload({
    include: buildLabeledItemIncludes(include),
  });

  res.json(
    apiData(toLabeledItemDto(item), {
      message: "Article mis à jour avec succès",
    }) satisfies UpdateLabeledItemResponse,
  );
};

export const deleteLabeledItem = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const toDelete = await findByPkOrThrow(LabeledItem, id, "Article non trouvé");
  await toDelete.destroy();

  res.json(
    apiMessage("Article supprimé avec succès") satisfies DeleteLabeledItemResponse,
  );
};

export const tagItemAsSell = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const item = await findByPkOrThrow(LabeledItem, id, "Article non trouvé");
  if (item.status !== "available")
    throw new createHttpError[400]("Article non disponible");
  await item.update({
    status: "sold",
  });

  res.json(
    apiMessage("Article marqué comme vendu") satisfies TagLabeledItemSoldResponse,
  );
};

export const itemsStats = async (req: Request, res: Response) => {
  const { search, page: _page, include: _include, date_from, date_to, ...filter } =
    labeledItemStatsFilterSchema.parse(req.query);
  const likeQuery = search ? { [Op.like]: `%${search}%` } : null;
  const dateRange = formatWhereDateRange(date_from, date_to);
  const where: ModelWhere<typeof LabeledItem> = likeQuery
    ? {
      ...filter,
      ...(dateRange && { createdAt: dateRange }),
      [Op.or]: [
        { description: likeQuery },
        { id: likeQuery },
      ],
    }
    : { ...filter, ...(dateRange && { createdAt: dateRange }) };

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
  //FIXME failing here
  res.json(
    apiData(toLabeledItemStatsDto(stats[0]?.get({ plain: true }) as LabeledItemStatsRow | undefined)) satisfies LabeledItemStatsResponse,
  );
};
