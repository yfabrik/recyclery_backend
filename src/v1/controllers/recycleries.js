import createHttpError from "http-errors";
import { col, fn, literal, Op, where } from "sequelize";
import * as z from "zod";
import db from "../../models/index.js";
import { listCaisses } from "../../services/caisse.js";
import {
  idSchema,
  phoneSchema,
  postalSchema
} from "../../services/zod.js";
const {
  Recyclery,
  CashRegister,
  User,
  SalesTransaction,
  LabeledItem,
  EmployeeWorkdays,
  Employee,
  TaskSchedule,
} = db;

const dataSchema = z.object({
  name: z.string("Le nom de la recyclerie est requis"),
  address: z.string().nullish(),
  phone: phoneSchema().nullish(),
  email: z.email().nullish(),
  manager_id: idSchema().nullish(),
  city: z.string().nullish(),
  postal_code: postalSchema().nullish(),
  is_active: z.coerce.boolean().default(true),
});
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listRecycleries = async (req, res) => {
  const ALLOWED_INCLUDES = ["employees", "horaires"];
  const filterSchema = z.object({
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
    active: z.coerce.boolean().optional(),
  });

  const filter = filterSchema.parse(req.query);
  const where = {};
  if (filter.active) where.is_active = filter.active;
  const include = [];
  if (filter.include.includes("employees"))
    include.push({
      model: Employee,
      as: "employees",
      include: [{ model: EmployeeWorkdays }],
    });

  if (filter.include.includes("horaires"))
    include.push({
      model: TaskSchedule,
      // as: "horaires",
      required: false,
      where: { category: "vente" },
    });
  include.push(
    {
      model: CashRegister,
      required: false,
      as: "caisses",
      // separate:true
    },
    { model: User, as: "manager" },
  );

  const recycleries = await Recyclery.findAll({
    attributes: {
      include: [
        [
          literal(`(
        SELECT COUNT(*)
        FROM "CashRegisters" c
        WHERE c."recyclery_id" = "Recyclery"."id"
      )`),
          "cash_registers_count",
        ],
      ],
      // include: [[fn("COUNT", col("caisses.id")), "cash_registers_count"]], //empeche de lister les caisses
    },
    where,
    include,
    // group: ["Recyclery.id", "manager.id"],//group by empeche de lister les caisses , j'ai juste la premiere caisses
    order: [["name", "ASC"]],
  });
  res.json({ success: true, stores: recycleries, recycleries });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailRecyclerie = async (req, res) => {
  const { id } = req.params;
  const recyclerie = await Recyclery.findByPk(id, {
    include: [
      { model: CashRegister, as: "caisses" },
      { model: User, as: "manager" },
    ],
  });

  res.json({ success: true, store: recyclerie });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createRecyclerie = async (req, res) => {
  const data = dataSchema.parse(req.body);
  const recyclery = await Recyclery.create({
    ...data,
  });

  res.status(201).json({
    message: "Recyclerie créée avec succès",
    recyclery,
    store: recyclery,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateRecyclerie = async (req, res) => {
  const { id } = req.params;

  const data = dataSchema.parse(req.body);

  const recyclerie = await Recyclery.findByPk(id, {
    include: [{ model: TaskSchedule }],
  });
  if (!recyclerie) throw new createHttpError.NotFound("recyclerie non trouvé");

  //TODO FIXME IMPORTANT URGENT make transaction work
  try {
    if (data.is_active != recyclerie.is_active || data.name != recyclerie.name)
      for (const schedule of recyclerie.TaskSchedules) {
        await schedule.update({
          is_recurring: data.is_active,
          name: data.name,
        });
      }

    await recyclerie.update({
      ...data,
    });

    // await t.commit()
  } catch (err) {
    // await t.rollback()
    throw err;
  }

  res.json({
    success: true,
    message: "Recyclerie mise à jour avec succès",
    recyclery: recyclerie,
    store: recyclerie,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteRecyclerie = async (req, res) => {
  const { id } = req.params;

  const recyclerie = await Recyclery.findByPk(id);
  if (!recyclerie) throw new createHttpError.NotFound("Recyclerie non trouvée");
  await recyclerie.destroy();
  res.json({ message: "Recyclerie supprimée avec succès" });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCaissesRecyclerie = async (req, res) => {
  const { id } = req.params;

  const caisses = listCaisses(id);

  res.json({ success: true, cash_registers: caisses });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const recycleryStats = async (req, res) => {
  const { id } = req.params;

  const items = await LabeledItem.findOne({
    attributes: [
      [fn("COUNT", where(col("status"), "=", "available")), "available_items"],
      [fn("COUNT", where(col("status"), "=", "sold")), "sold_items"],
      [fn("COUNT", where(col("status"), "=", "reserved")), "reserved_items"],
      [fn("COUNT", col("*")), "total_items"],
    ],
    where: {
      recyclery_id: id,
    },
    raw: true,
  });

  const sales = await SalesTransaction.findOne({
    attributes: [
      [fn("COUNT", col("*")), "monthly_sales"],
      [fn("COALESCE", fn("SUM", col("total_amount")), 0), "monthly_revenue"],
    ],
    where: {
      recyclery_id: id,
      createdAt: {
        [Op.gte]: new Date(new Date().setDate(1)), // Start of the current month
      },
    },
    raw: true,
  });

  res.json({
    stats: {
      ...items,
      ...sales,
    },
  });
};
