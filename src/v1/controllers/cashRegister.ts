import {
  cashRegisterCreateSchema,
  cashRegisterFilterSchema,
  cashRegisterUpdateSchema,
} from "@recyclerie/api/schemas/cashRegister";
import type {
  CreateCashRegisterResponse,
  DeleteCashRegisterResponse,
  DetailCashRegisterResponse,
  ListCashRegistersResponse,
  UpdateCashRegisterResponse,
} from "@recyclerie/api/responses/cashRegister";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import logger from "../../services/logger.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { findCashRegistersWithAggregates } from "../../services/caisse.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import {
  toCashRegisterDetailDto,
  toCashRegisterDto,
  toCashRegisterListDto,
} from "../../mappers/cashRegister.js";

const { CashRegister, Recyclery, CashSession } = db;

export const listCaisses = async (req: Request, res: Response) => {
  const store_id = idSchema().optional().parse(req.params.id);

  const filter = cashRegisterFilterSchema.parse({ store_id, ...req.query });

  const cashRegister = await findCashRegistersWithAggregates({
    ...(filter.store_id != null ? { store_id: filter.store_id } : {}),
    ...(filter.is_active !== undefined ? { is_active: filter.is_active } : {}),
  });

  res.json(
    apiData(
      cashRegister.map((register) => {
        const plain = register.get({ plain: true }) as typeof register & {
          store_name?: string | null;
          total_sessions?: number | string;
          last_session?: Date | string | null;
        };
        return toCashRegisterListDto(plain);
      }),
    ) satisfies ListCashRegistersResponse,
  );
};

export const detailCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const register = await findByPkOrThrow(CashRegister, id, "Caisse non trouvée", {
    include: [
      {
        model: CashSession,
        as: "sessions",
        required: false,
      },
      { model: Recyclery, required: false },
    ],
    order: [[{ model: CashSession, as: "sessions" }, "createdAt", "DESC"]],
  });
  const sessions = register.sessions!;

  const lastSession = sessions.reduce<Date | null>((latest, session) => {
    const createdAt = session.createdAt;
    if (!latest || createdAt > latest) return createdAt;
    return latest;
  }, null);

  res.json(
    apiData(
      toCashRegisterDetailDto(register, {
        store_name: register.get("Recyclery")
          ? (register.get("Recyclery")?.get("name") ?? null)
          : null,
        total_sessions: sessions.length,
        last_session: lastSession,
      }),
    ) satisfies DetailCashRegisterResponse,
  );
};

export const createCaisse = async (req: Request, res: Response) => {
  const data = cashRegisterCreateSchema.parse(req.body);

  const store = await findByPkOrThrow(Recyclery, data.store_id, "Magasin non trouvé");

  const result = await store.createCaisse({
    name: data.name,
    is_active: data.is_active,
  });

  res
    .status(201)
    .json(
      apiCreated(
        toCashRegisterDto({
          id: result.id,
          name: result.name,
          is_active: result.is_active,
          recyclery_id: result.recyclery_id,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          store_name: store.name,
          total_sessions: 0,
          last_session: null,
          Recyclery: store,
        }),
        {
          message: "Caisse créée avec succès",
        },
      ) satisfies CreateCashRegisterResponse,
    );
};

export const updateCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = cashRegisterUpdateSchema.parse(req.body);

  const existingRegister = await findByPkOrThrow(
    CashRegister,
    id,
    "Caisse non trouvée",
    {
      include: [
        { model: Recyclery, required: false },
        {
          model: CashSession,
          as: "sessions",
          attributes: ["id", "createdAt"],
          required: false,
        },
      ],
    },
  );
  await existingRegister.update({ ...data });

  const sessions = existingRegister.sessions ?? [];
  const lastSession = sessions.reduce<Date | null>((latest, session) => {
    const createdAt = session.createdAt;
    if (!latest || createdAt > latest) return createdAt;
    return latest;
  }, null);

  res.json(
    apiData(
      toCashRegisterDto({
        id: existingRegister.id,
        name: existingRegister.name,
        is_active: existingRegister.is_active,
        recyclery_id: existingRegister.recyclery_id,
        createdAt: existingRegister.createdAt,
        updatedAt: existingRegister.updatedAt,
        store_name: existingRegister.Recyclery?.name ?? null,
        total_sessions: sessions.length,
        last_session: lastSession,
        Recyclery: existingRegister.Recyclery ?? null,
      }),
      {
        message: "Caisse mise à jour avec succès",
      },
    ) satisfies UpdateCashRegisterResponse,
  );
};

export const deleteCaisse = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const existingRegister = await findByPkOrThrow(
    CashRegister,
    id,
    "Caisse non trouvée",
  );

  await existingRegister.destroy();

  res.json(
    apiMessage("Caisse supprimée avec succès") satisfies DeleteCashRegisterResponse,
  );
};
/**
 * @deprecated
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listCaissesMagasin = async (req: Request, res: Response) => {
  const { store_id } = req.params;
  req.query.store_id = store_id;
  logger.error("called list caisse magasin, REMAKE THIS ONE");
  listCaisses(req, res);
};
