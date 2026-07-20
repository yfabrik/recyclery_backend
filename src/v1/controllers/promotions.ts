import type { Includeable } from "sequelize";
import { promotionDataSchema } from "@recyclerie/api/schemas/promotions";
import type {
  CreatePromotionResponse,
  DeletePromotionResponse,
  ListPromotionsResponse,
  UpdatePromotionResponse,
} from "@recyclerie/api/responses/promotions";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";
import { toPromotionDto } from "../../mappers/promotions.js";

const { Promotion, Category, Recyclery } = db;

const promotionIncludes: Includeable[] = [
  {
    model: Category,
    include: [
      {
        model: Category,
        as: "parent",
        required: false,
      },
      {
        model: Category,
        as: "subcategories",
        required: false,
      },
    ],
  },
  {
    model: Recyclery,
    as: "stores",
    required: false,
  },
];

export const listPromotions = async (_req: Request, res: Response) => {
  const promotions = await Promotion.findAll({
    include: promotionIncludes,
    order: [["startDate", "DESC"]],
  });
  return res.json(
    apiData(promotions.map(toPromotionDto)) satisfies ListPromotionsResponse,
  );
};

export const createPromotion = async (req: Request, res: Response) => {
  const data = promotionDataSchema.parse(req.body);
  const { stores, ...promotionData } = data;
  const promo = await db.sequelize.transaction(async (t) => {
    const created = await Promotion.create(promotionData, { transaction: t });
    if (Array.isArray(stores)) {
      await created.setStores(stores, { transaction: t });
    }
    return created;
  });
  await promo.reload({
    include: [
      {
        model: Recyclery,
        as: "stores",
        required: false,
      },
    ],
  });
  return res.status(201).json(
    apiCreated(toPromotionDto(promo), { message: "promo cree" }) satisfies CreatePromotionResponse,
  );
};

export const updatePromotion = async (req: Request, res: Response) => {
  const data = promotionDataSchema.parse(req.body);
  const id = idSchema().parse(req.params.id);
  const promo = await findByPkOrThrow(Promotion, id, "promo pas trouvé");
  const { stores, ...promotionData } = data;
  await db.sequelize.transaction(async (t) => {
    await promo.update(promotionData, { transaction: t });
    if (Array.isArray(stores)) {
      await promo.setStores(stores, { transaction: t });
    }
    if (stores === null) {
      await promo.setStores([], { transaction: t });
    }
  });
  await promo.reload({
    include: [
      {
        model: Recyclery,
        as: "stores",
        required: false,
      },
    ],
  });
  return res.json(
    apiData(toPromotionDto(promo), { message: "promo mis a jour" }) satisfies UpdatePromotionResponse,
  );
};

export const deletePromotion = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const promo = await findByPkOrThrow(Promotion, id, "promo pas trouvé");
  await promo.destroy();
  return res.json(
    apiMessage("promo supprimé") satisfies DeletePromotionResponse,
  );
};
