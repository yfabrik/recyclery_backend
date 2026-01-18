import createHttpError from "http-errors";
import db from "../../models/index.js";

import { Op } from "sequelize";
import z from "zod";
import { idSchema, nullishToNull } from "../../services/zod.js";
import logger from "../../services/logger.js";

const { LabeledItem, Category, User } = db;

// export const listItems = async (req, res) => {
//     const { recyclery_id, category_id, status } = req.query;
//     const where = {};
//     if (recyclery_id) where.recyclery_id = recyclery_id;
//     if (category_id) where.category_id = category_id;
//     if (status) where.status = status;

//     const items = await Item.findAll({
//         where,
//     });

//     res.json({ items });
// }
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
    barcode: z.string().optional()
  })
  const { search, ...filter } = filterSchema.parse(req.query)
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = { ...filter };

  if (search) {
    const likeQuery = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { name: likeQuery },
      { description: likeQuery },
      { barcode: likeQuery },
    ];
  }

  const labeledItems = await LabeledItem.findAll({
    where,
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
      },
      // {
      //   model: Category,
      //   as: "subcategory",
      //   attributes: ["id", "name"],
      // },
      {
        model: User,
        as: "createdBy",
        attributes: ["id", "username"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json({ success: true, items: labeledItems });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const getItemFromBarcode = async (req, res) => {
  logger.warn("used getItemFromBarcode TO REMOVE")
  const { barcode } = req.params;
  const item = await LabeledItem.findOne({ where: { barcode: barcode } });

  if (!item) throw new createHttpError[404]("Article non trouvé") //TODO barcode as query param

  res.json({ success: true, item });
};

// export const createItem = async (req, res) => {
//     const {
//         name,
//         description,
//         category_id,
//         barcode,
//         purchase_price,
//         selling_price,
//         recyclery_id,
//     } = req.body;

//     if (!name || !recyclery_id) {
//         return res.status(400).json({ error: "Nom et recyclerie requis" });
//     }

//     const item = await Item.create({
//         name,
//         description,
//         category_id,
//         barcode,
//         purchase_price,
//         selling_price,
//         recyclery_id,
//     });

//     res.status(201).json({
//         message: "Article créé avec succès",
//         item,
//     });
// }
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createLabeledItem = async (req, res) => {
  const dataSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    category_id: idSchema("categorie requis"),
    weight: z.coerce.number().nonnegative().optional(),
    price: z.coerce.number().nonnegative("prix requis"),
    cost: z.coerce.number().nonnegative().optional(),
    condition_state: z.enum(["excellent", "good", "fair", "poor"]).optional(),
    location: z.string().optional(),
    arrival_id: idSchema(),
    purchase_price: z.coerce.number().nonnegative(),
    selling_price: z.coerce.number().nonnegative(),
    recyclery_id: idSchema()
  })
  // let {
  //   name,
  //   description,
  //   category_id,
  //   subcategory_id,
  //   weight,
  //   price,
  //   cost,
  //   condition_state,
  //   location,
  //   arrival_id,
  //   purchase_price,
  //   selling_price,
  //   recyclery_id,
  // } = req.body;

  // if (!price) price = selling_price;
  // if (!cost) cost = purchase_price;
  const data = dataSchema.parse(req.body)

  // Validation des champs requis
  // if (!category_id || !price) {
  //   return res.status(400).json({
  //     success: false,
  //     error: "La catégorie et le prix sont obligatoires",
  //   });
  // }

  // Générer un code-barres unique (format: REC + timestamp + random)
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const barcode = `REC${timestamp}${random}`;

  // Récupérer le nom de la catégorie pour l'utiliser comme nom de l'article
  const category = await Category.findByPk(data.category_id);
  if (!data.name) data.name = category ? category.name : "Article";

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
  const dataSchema = z.object({
    name: z.string("nom requis"),
    description:nullishToNull( z.string().optional()),
    category_id: idSchema("categorie requis"),
    weight: z.coerce.number().nonnegative().optional(),
    price: z.coerce.number().nonnegative("prix requis"),
    cost: z.coerce.number().nonnegative().optional(),
    condition_state: z.enum(["excellent", "good", "fair", "poor"]).optional(),
    location: z.string().optional(),
    status: z.enum(["available", "sold"]).optional()
  })
  const data = dataSchema.parse(req.body)

  const item = await LabeledItem.findByPk(id);
  if (!item) throw new createHttpError[404]("item non trouvé")
  await item.update(
    ...data
  )
  // const params = [
  //   name,
  //   description || null,
  //   category_id,
  //   subcategory_id || null,
  //   weight || null,
  //   price,
  //   cost || null,
  //   condition_state || "good",
  //   location || null,
  //   status || "available",
  //   id,
  // ];

  // const updated = {
  //   ...item,
  //   ...params,
  // };

  // const newLabel = await updated.save();

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

  if (deleted === 0) throw new createHttpError[404]("Article non trouvé")

  res.json({ success: true, message: "Article supprimé avec succès" });
};
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const tagItemAsSell = async (req, res) => {
  const { id } = req.params;
  const updated = await LabeledItem.update(
    {
      status: "sold",
      sold_at: new Date(),
      sold_by: req.user.id,
    },
    {
      where: {
        id,
        status: "available",
      },
    }
  );

  res.json({ success: true, message: "Article marqué comme vendu" });
};
