import { col, fn, literal, Op, where } from "sequelize";
import {
  recycleryDataSchema,
  recycleryFilterSchema,
} from "@recyclerie/api/schemas/recycleries";
import type {
  CreateRecycleryResponse,
  DeleteRecycleryResponse,
  DetailRecycleryResponse,
  ListRecycleriesResponse,
  ListRecycleryCashRegistersResponse,
  RecycleryStatsResponse,
  UpdateRecycleryResponse,
} from "@recyclerie/api/responses/recycleries";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { listCaisses } from "../../services/caisse.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import type { ModelWhere } from "../../models/db-types.js";
import { toCashRegisterDto } from "../../mappers/cashRegister.js";
import {
  toRecycleryDto,
  toRecycleryStatsDto,
  type RecycleryItemStatsRow,
} from "../../mappers/recycleries.js";

const {
  Recyclery,
  CashRegister,
  User,
  TaskSchedule,
  EmployeeWorkdays,
  Employee,
  LabeledItem,
  SalesTransaction,
  CashSession,
} = db;

export const listRecycleries = async (req: Request, res: Response) => {
  const filter = recycleryFilterSchema.parse(req.query);  const where: ModelWhere<typeof Recyclery> = {};
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
  if (filter.include.includes("caisses")){

    include.push(
      {
        model: CashRegister,
        required: false,
        as: "caisses",
        // separate:true
        include: [
          {
            model: CashSession,
            as: "sessions",
            required: false,
          },
        ],
      },
      { model: User, as: "manager" },
    );
  }

  const recycleries = await Recyclery.findAll({
    attributes: {
      include: [
        [
          literal(`(
        SELECT COUNT(*)
        FROM \`CashRegisters\` c
        WHERE c.\`recyclery_id\` = \`Recyclery\`.\`id\`
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
  res.json(
    apiData(recycleries.map(toRecycleryDto)) satisfies ListRecycleriesResponse,
  );
};

export const detailRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const recyclerie = await findByPkOrThrow(Recyclery, id, "Recyclerie non trouvée", {
    include: [
      { model: CashRegister, as: "caisses" },
      { model: User, as: "manager" },
    ],
  });

  res.json(
    apiData(toRecycleryDto(recyclerie)) satisfies DetailRecycleryResponse,
  );
};

export const createRecyclerie = async (req: Request, res: Response) => {
  const data = recycleryDataSchema.parse(req.body);
  const recyclery = await Recyclery.create({
    ...data,
  });

  res
    .status(201)
    .json(
      apiCreated(toRecycleryDto(recyclery), {
        message: "Recyclerie créée avec succès",
      }) satisfies CreateRecycleryResponse,
    );
};

export const updateRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = recycleryDataSchema.parse(req.body);

  const recyclerie = await findByPkOrThrow(
    Recyclery,
    id,
    "recyclerie non trouvé",
    {
      include: [
        { model: TaskSchedule, where: { category: "vente" }, required: false },
      ],
    },
  );

  await db.sequelize.transaction(async (t) => {
    await recyclerie.update(
      {
        ...data,
      },
      { transaction: t },
    );
  });

  res.json(
    apiData(toRecycleryDto(recyclerie), {
      message: "Recyclerie mise à jour avec succès",
    }) satisfies UpdateRecycleryResponse,
  );
};

export const deleteRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const recyclerie = await findByPkOrThrow(
    Recyclery,
    id,
    "Recyclerie non trouvée",
  );
  await recyclerie.destroy();
  res.json(
    apiMessage("Recyclerie supprimée avec succès") satisfies DeleteRecycleryResponse,
  );
};

export const listCaissesRecyclerie = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const caisses = await listCaisses(id);

  res.json(
    apiData(caisses.map(toCashRegisterDto)) satisfies ListRecycleryCashRegistersResponse,
  );
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
  //y'a des truc similmaire dans dashboard ?
  const startOfMonth = new Date(new Date().setDate(1));
  const salesResult = (await SalesTransaction.findOne({
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
  })) as {
    monthly_sales?: number | string;
    monthly_revenue?: number | string;
  } | null;

  const sales = salesResult
    ? {
        monthly_sales: Number(salesResult.monthly_sales ?? 0),
        monthly_revenue: Number(salesResult.monthly_revenue ?? 0),
      }
    : { monthly_sales: 0, monthly_revenue: 0 };

  res.json(
    apiData(
      toRecycleryStatsDto({ items: items as RecycleryItemStatsRow | null, sales }),
    ) satisfies RecycleryStatsResponse,
  );
};
