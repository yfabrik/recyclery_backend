import z from "zod";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { Request, Response } from "express";

import db from "../../models/index.js";

const { Promotion, Category, Recyclery } = db;

const dataSchema = z.object({
  startDate: z.coerce.date().transform((v) => v.toDateString()),
  endDate: z.coerce
    .date()
    .transform((v) => v.toDateString())
    .nullable(),
  isActive: z.coerce.boolean().default(true),
  promotionValue: z.coerce
    .number("promotion requise")
    .min(0, "promo min 0")
    .max(100, "promo max 100"),
  category_id: idSchema("categorie requise"),
  stores: z.array(idSchema()).nullish(),
  // subcategory_id: idSchema().nullable()
});

export const listPromotions = async (_req: Request, res: Response) => {
  const promotions = await Promotion.findAll({
    include: [
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
    ],
  });
  return res.json({ success: true, message: "promotions", data: promotions });
};

export const createPromotion = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
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
  return res.json({ success: true, message: "promo cree", data: promo });
};

export const updatePromotion = async (req: Request, res: Response) => {
  const data = dataSchema.parse(req.body);
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
  return res.json({ success: true, message: "promo mis a jour", data: promo });
};

export const deletePromotion = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const promo = await findByPkOrThrow(Promotion, id, "promo pas trouvé");
  await promo.destroy();
  return res.json({ success: true, message: "promo supprimé" });
};
