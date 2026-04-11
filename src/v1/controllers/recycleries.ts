import createHttpError from "http-errors";
import {
  col,
  fn,
  literal,
  Op,
  where,
  type Attributes,
  type WhereOptions,
} from "sequelize";
import * as z from "zod";
import { listCaisses } from "../../services/caisse.js";
import { idSchema, phoneSchema, postalSchema } from "../../services/zod.js";
import Recyclery from "../../models/recyclery.js";
import CashRegister from "../../models/cashregister.js";
import User from "../../models/user.js";
import TaskSchedule from "../../models/taskschedule.js";
import EmployeeWorkdays from "../../models/employeeworkdays.js";
import Employee from "../../models/employee.js";
import type { Request, Response } from "express";
import LabeledItem from "../../models/labeleditem.js";
import SalesTransaction from "../../models/salestransaction.js";
import CashSession from "../../models/cashsession.js";

const dataSchema = z.object({
  name: z.string("Le nom de la recyclerie est requis"),
  address: z.string().nullish().prefault(null),
  phone: phoneSchema().nullish().prefault(null),
  email: z.email().nullish().prefault(null),
  manager_id: idSchema().nullish().prefault(null),
  city: z.string().nullish().prefault(null),
  postal_code: postalSchema().nullish().prefault(null),
  is_active: z.coerce.boolean().default(true),
});

export const listRecycleries = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["employees", "horaires", "caisses"];
  const filterSchema = z.object({
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
    active: z.coerce.boolean().optional(),
  });

  const filter = filterSchema.parse(req.query);
  const where: WhereOptions<Attributes<Recyclery>> = {};
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

export const detailRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const recyclerie = await Recyclery.findByPk(id, {
    include: [
      { model: CashRegister, as: "caisses" },
      { model: User, as: "manager" },
    ],
  });

  res.json({ success: true, store: recyclerie });
};

export const createRecyclerie = async (req: Request, res: Response) => {
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

export const updateRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  const recyclerie = await Recyclery.findByPk(id, {
    include: [
      { model: TaskSchedule, where: { category: "vente" }, required: false },
    ],
  });
  if (!recyclerie) throw new createHttpError.NotFound("recyclerie non trouvé");

  //TODO FIXME IMPORTANT URGENT make transaction work
  try {
    // if (data.is_active != recyclerie.is_active || data.name != recyclerie.name)
    //   for (const schedule of recyclerie.TaskSchedules || []) {
    //     await schedule.update({
    //       is_recurring: data.is_active,
    //       name: "vente-"+data.name,
    //     });
    //   }

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

export const deleteRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

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
export const listCaissesRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const caisses = listCaisses(id);

  res.json({ success: true, cash_registers: caisses });
};

export const recycleryStats = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

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

  const startOfMonth = new Date(new Date().setDate(1));
  const salesResult = await SalesTransaction.findOne({
    attributes: [
      [fn("COUNT", col("SalesTransaction.id")), "monthly_sales"],
      [
        fn("COALESCE", fn("SUM", col("SalesTransaction.total_amount")), 0),
        "monthly_revenue",
      ],
    ],
    include: [
      {
        model: CashSession,
        required: true,
        attributes: [],
        include: [
          {
            model: CashRegister,
            required: true,
            where: { recyclery_id: id },
            attributes: [],
          },
        ],
      },
    ],
    where: {
      createdAt: { [Op.gte]: startOfMonth },
    },
    raw: true,
  }) as { monthly_sales?: number | string; monthly_revenue?: number | string } | null

  const sales = salesResult
    ? {
      monthly_sales: Number(salesResult.monthly_sales ?? 0),
      monthly_revenue: Number(salesResult.monthly_revenue ?? 0),
    }
    : { monthly_sales: 0, monthly_revenue: 0 };

  res.json({
    stats: {
      ...items,
      ...sales,
    },
  });
};
