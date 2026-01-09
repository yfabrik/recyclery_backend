import db from  "../../models/index.js"
import * as z from "zod"
import { createTask, listTasks } from "./tasks.js";

const { CollectionSchedule, User } = db;

/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
//FIXME doublon avec collection schedule
export const listCollections = async (req, res) => {
    const { recyclery_id, status } = req.query;
    req.query.category = "collection"
    req.query.include = "user"
    return listTasks(req,res)

      /**
   * @type {import("sequelize").WhereOptions}
   */
    const where = {};
    

    if (recyclery_id) where.recyclery_id = recyclery_id;
    if (status) where.status = status;

    const collections = await CollectionSchedule.findAll({
      where,
      include: [{ model: User }],
      order: [["scheduled_date", "ASC"]],
    });

    res.json({ collections });
  }
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
  export const createCollection = async (req, res) => {
    req.body.category= "collection"
    return createTask(req,res)
    const {
      collection_date,
      address,
      contact_name,
      contact_phone,
      description,
      assigned_to,
      recyclery_id,
    } = req.body;

    if (!collection_date || !address || !contact_name || !recyclery_id) {
      return res
        .status(400)
        .json({ error: "Date, adresse, contact et recyclerie requis" });
    }

    const collection = await CollectionSchedule.create({
      scheduled_date: collection_date,
      address,
      contact_name,
      contact_phone,
      notes: description,
      employee_id: assigned_to,
      recyclery_id,
    });

    res.status(201).json({
      message: "Collecte programmée avec succès",
      collection,
    });
  }