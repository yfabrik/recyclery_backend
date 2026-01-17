import createHttpError from "http-errors";
import db from "../../models/index.js";
import * as z from "zod";
import { listCaisses } from "../../services/caisse.js";
import { col, fn, literal, Op, where } from "sequelize";
import { idSchema, nullishToNull, phoneSchema, postalSchema } from "../../services/zod.js";
const {
  Recyclery,
  CashRegister,
  User,
  SalesTransaction,
  LabeledItem,
  EmployeeWorkdays,
} = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listRecycleries = async (req, res) => {
  const ALLOWED_INCLUDES = ["employees"];
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
      model: User,
      as: "employees",
      include: [{ model: EmployeeWorkdays }],
    });

  include.push(
    {
      model: CashRegister,
      required: false,
      as: "caisses",
      // separate:true
    },
    { model: User, as: "manager" }
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

// export const listStoreWIthEmployee = async (req, res) => {
//   const stores = await Recyclery.findAll({
//     include: [{ model: User, as: "employees", include: [{ model: EmployeeWorkdays }] }],
//   });
//   res.json({ success: true, stores });
// };
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
  const dataSchema = z.object({
    name: z.string("Le nom de la recyclerie est requis"),
    address: z.string().optional(),
    phone: phoneSchema().optional(),
    email: z.email().optional(),
    manager_id: idSchema().optional(),
    city: z.string().optional(),
    postal_code: postalSchema().optional(),
    is_active: z.coerce.boolean().default(true),
  });
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
  const dataSchema = z.object({
    name: z.string("Le nom de la recyclerie est requis"),
    address: nullishToNull(z.string().optional()),
    phone: nullishToNull(phoneSchema().optional()),
    email: nullishToNull(z.email().optional()),
    manager_id: nullishToNull(idSchema().optional()),
    city: nullishToNull(z.string().optional()),
    postal_code: nullishToNull(postalSchema().optional()),
    is_active: z.coerce.boolean().default(true),
  });
  const data = dataSchema.parse(req.body);

  const recyclerie = await Recyclery.findByPk(id);
  if (!recyclerie) throw new createHttpError.NotFound("recyclerie non trouvé");

  await recyclerie.update({...data})

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

  const recyclerie = await Recyclery.destroy({ where: { id } });
  if (!recyclerie) throw new createHttpError.NotFound("Recyclerie non trouvée");

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

// export const createCaisse = async (req, res) => {
//   const { id } = req.params;
//   const { name } = req.body;

//   if (!name) {
//     throw new createHttpError.BadRequest("Le nom de la caisse est obligatoire");
//   }
//   const caisse = CashRegister.create({ name, recyclery_id: id });

//   res.status(201).json({
//     success: true,
//     message: "Caisse créée avec succès",
//     cash_register_id: caisse.id,
//   });
// };
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
