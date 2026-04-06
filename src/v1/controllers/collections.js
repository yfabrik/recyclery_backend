import db from "../../models/index.js";
import * as z from "zod";
import { createTask, listTasks } from "./tasks.js";
import logger from "../../services/logger.js";

const { Employee, Task } = db;

/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
//FIXME doublon avec collection schedule
export const listCollections = async (req, res) => {
  logger.info("called collection controller FIXME");
  const { recyclery_id, status } = req.query;

  /**
   * @type {import("sequelize").WhereOptions<import("../../models/types/taskModel.js").TaskAttributes>}
   */
  const where = { category: "collection" };
  if (recyclery_id) where.recyclery_id = recyclery_id;
  if (status) where.status = status;
  const include = [{ model: Employee }];

  const collections = await Task.findAll({
    include,
    where,
    order: [["createdAt", "DESC"]],
  });

  // if (recyclery_id) where.recyclery_id = recyclery_id;
  // if (status) where.status = status;

  // const collections = await CollectionSchedule.findAll({
  //   where,
  //   include: [{ model: User }],
  //   order: [["scheduled_date", "ASC"]],
  // });

  res.json({ collections });
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createCollection = async (req, res) => {
  logger.info("called collection controller FIXME");

  const dataSchema = z.object({
    collection_date: z.coerce.date(
      "Date, adresse, contact et recyclerie requis",
    ),
    address: z.string("Date, adresse, contact et recyclerie requis"),
    contact_name: z.string("Date, adresse, contact et recyclerie requis"),
    contact_phone: z.string().optional(),
    description: z.string().optional(),
    assigned_to: z.string().optional(),
    recyclery_id: z.coerce.number().positive(),
  });
  const data = dataSchema.parse(req.body);
  req.body.category = "collection";
  const collection = await Task.create({
    category: "collection",
    scheduled_date: data.collection_date,
    name: "collection-" + data.collection_date,
  });

  // const collection = await CollectionSchedule.create({
  //   scheduled_date: collection_date,
  //   address,
  //   contact_name,
  //   contact_phone,
  //   notes: description,
  //   employee_id: assigned_to,
  //   recyclery_id,
  // });

  res.status(201).json({
    message: "Collecte programmée avec succès",
    collection,
  });
};
