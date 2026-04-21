import z from "zod";
import createHttpError from "http-errors";
import { idSchema } from "../../services/zod.js";
import {
  chargeGiftCard,
  findGiftCardByCode,
  getGiftCardBalance,
  issueGiftCard,
  recreditGiftCard,
} from "../../services/giftCards.js";
import type { Request, Response } from "express";
import { Op} from "sequelize";

import db from "../../models/index.js";
import { type ModelWhere, type RequestWithUser } from "./types.js";

const { GiftCard, GiftCardTransaction } = db;

const issueSchema = z.object({
  code: z.string().trim().min(1, "code requis"),
  initial_value: z.coerce.number("valeur initiale requise").min(0),
  expires_at: z.coerce.date().nullish(),
  issued_transaction_id: idSchema().nullish(),
  issued_refund_transaction_id: idSchema().nullish(),
  note: z.string().trim().nullish(),
  recipient_name: z.string().trim().nullish(),
  recipient_email: z.email().nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
});

const movementSchema = z.object({
  sales_transaction_id: idSchema("transaction requise"),
  amount: z.coerce.number("montant requis").positive(),
  metadata: z.record(z.string(), z.any()).nullish(),
});

const listSchema = z.object({
  status: z
    .enum(["active", "partially_used", "redeemed", "expired", "cancelled"])
    .optional(),
  code: z.string().trim().optional(),
  limit: z.coerce.number().positive().max(200).default(50),
  offset: z.coerce.number().nonnegative().default(0),
});

export const listGiftCards = async (req: Request, res: Response) => {
  const filter = listSchema.parse(req.query);

  const where: ModelWhere<typeof GiftCard> = {};

  if (filter.status) where.status = filter.status;
  if (filter.code) {
    where.code = { [Op.like]: `%${filter.code}%` };
  }

  const result = await GiftCard.findAndCountAll({
    where,
    include: [
      {
        model: GiftCardTransaction,
        as: "movements",
        order: [["createdAt", "DESC"]],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: filter.limit,
    offset: filter.offset,
  });

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      limit: filter.limit,
      offset: filter.offset,
      total: result.count,
    },
  });
};

export const createGiftCard = async (
  req: RequestWithUser,
  res: Response,
) => {
  const data = issueSchema.parse(req.body);
  const card = await issueGiftCard({
    code: data.code,
    initialValue: data.initial_value,
    expiresAt: data.expires_at || null,
    issuedTransactionId: data.issued_transaction_id || null,
    issuedRefundTransactionId: data.issued_refund_transaction_id || null,
    createdBy: req.user.id,
    note: data.note || null,
    recipientName: data.recipient_name || null,
    recipientEmail: data.recipient_email || null,
    metadata: data.metadata || null,
  });

  res.status(201).json({
    success: true,
    message: "Gift card creee",
    data: card,
  });
};

export const getGiftCardByCode = async (req: Request, res: Response) => {
  const code = z.string().trim().min(1).parse(req.params.code);
  const card = await findGiftCardByCode(code);
  if (!card) throw new createHttpError.NotFound("gift card introuvable");
  res.json({ success: true, data: card });
};

export const getGiftCardCurrentBalance = async (
  req: Request,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const balance = await getGiftCardBalance(id);
  res.json({
    success: true,
    data: {
      id,
      code: balance.giftCard.code,
      initial_value: balance.initialValue,
      movement_sum: balance.movementSum,
      current_balance: balance.currentBalance,
    },
  });
};

export const createGiftCardCharge = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const data = movementSchema.parse(req.body);
  const movement = await chargeGiftCard({
    giftCardId: id,
    salesTransactionId: data.sales_transaction_id,
    amount: data.amount,
    createdBy: req.user.id,
    metadata: data.metadata || null,
  });
  res.status(201).json({
    success: true,
    message: "Debit gift card enregistre",
    data: movement,
  });
};

export const createGiftCardRecredit = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const data = movementSchema.parse(req.body);
  const movement = await recreditGiftCard({
    giftCardId: id,
    salesTransactionId: data.sales_transaction_id,
    amount: data.amount,
    createdBy: req.user.id,
    metadata: data.metadata || null,
  });
  res.status(201).json({
    success: true,
    message: "Recredit gift card enregistre",
    data: movement,
  });
};
