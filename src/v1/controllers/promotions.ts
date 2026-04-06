import z from "zod";
import { idSchema } from "../../services/zod.js";
import createHttpError from "http-errors";
import Promotion from "../../models/promotion.js";
import type { Request, Response } from "express";
import Category from "../../models/category.js";
import Recyclery from "../../models/recyclery.js";


const dataSchema = z.object({
  startDate: z.coerce.date().transform(v => v.toDateString()),
  endDate: z.coerce.date().transform(v => v.toDateString()).nullable(),
  isActive: z.coerce.boolean().default(true),
  promotionValue: z.coerce
    .number("promotion requise")
    .min(0, "promo min 0")
    .max(100, "promo max 100"),
  category_id: idSchema("categorie requise"),
  stores: z.array(idSchema()).optional(),
  // subcategory_id: idSchema().nullable()
});


export const listPromotions = async (req: Request, res: Response) => {
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
  const promo = await Promotion.create(promotionData);
  if (Array.isArray(stores)) {
    await promo.setStores(stores);
  }
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
  const promo = await Promotion.findByPk(id);
  if (!promo) throw new createHttpError.NotFound("promo pas trouvé");
  const { stores, ...promotionData } = data;
  await promo.update(promotionData);
  if (Array.isArray(stores)) {
    await promo.setStores(stores);
  }
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
  const promo = await Promotion.findByPk(id);
  if (!promo) throw new createHttpError.NotFound("promo pas trouvé");
  await promo.destroy();
  return res.json({ success: true, message: "promo supprimé" });
};
