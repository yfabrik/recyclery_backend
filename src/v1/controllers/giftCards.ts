import createHttpError from "http-errors";
import {
  giftCardCodeParamSchema,
  giftCardIssueSchema,
  giftCardListFilterSchema,
  giftCardMovementSchema,
} from "@recyclerie/api/schemas/giftCards";
import type {
  CreateGiftCardMovementResponse,
  CreateGiftCardResponse,
  DetailGiftCardResponse,
  GiftCardBalanceResponse,
  ListGiftCardsResponse,
} from "@recyclerie/api/responses/giftCards";
import {
  apiCreated,
  apiData,
  apiPaginated,
} from "@recyclerie/api/types/response";
import {
  buildPaginationMeta,
  buildUnpaginatedMeta,
  parsePaginationQuery,
} from "../../services/pagination.js";
import { idSchema } from "../../services/zod.js";
import {
  chargeGiftCard,
  findGiftCardByCode,
  getGiftCardBalance,
  issueGiftCard,
  recreditGiftCard,
} from "../../services/giftCards.js";
import type { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../../models/index.js";
import {
  toGiftCardBalanceDto,
  toGiftCardDto,
  toGiftCardTransactionDto,
} from "../../mappers/giftCards.js";
import { type ModelWhere, type RequestWithUser } from "./types.js";
const { GiftCard, GiftCardTransaction } = db;
export const listGiftCards = async (req: Request, res: Response) => {
  const filter = giftCardListFilterSchema.parse(req.query);
  const pagination = parsePaginationQuery(req.query);
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
    ...(pagination.paginated
      ? { limit: pagination.limit, offset: pagination.offset }
      : {}),
  });
  res.json(
    apiPaginated(
      result.rows.map(toGiftCardDto),
      pagination.paginated
        ? buildPaginationMeta(pagination.page, pagination.perPage, result.count)
        : buildUnpaginatedMeta(result.count),
    ) satisfies ListGiftCardsResponse,
  );
};
export const createGiftCard = async (req: RequestWithUser, res: Response) => {
  const data = giftCardIssueSchema.parse(req.body);
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
  res.status(201).json(
    apiCreated(toGiftCardDto(card), {
      message: "Gift card creee",
    }) satisfies CreateGiftCardResponse,
  );
};
export const getGiftCardByCode = async (req: Request, res: Response) => {
  const code = giftCardCodeParamSchema.parse(req.params.code);
  const card = await findGiftCardByCode(code);
  if (!card) throw new createHttpError.NotFound("gift card introuvable");
  res.json(
    apiData(toGiftCardDto(card)) satisfies DetailGiftCardResponse,
  );
};
export const getGiftCardCurrentBalance = async (
  req: Request,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const balance = await getGiftCardBalance(id);
  res.json(
    apiData(
      toGiftCardBalanceDto({
        id,
        code: balance.giftCard.code,
        initial_value: balance.initialValue,
        movement_sum: balance.movementSum,
        current_balance: balance.currentBalance,
      }),
    ) satisfies GiftCardBalanceResponse,
  );
};
export const createGiftCardCharge = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const data = giftCardMovementSchema.parse(req.body);
  const movement = await chargeGiftCard({
    giftCardId: id,
    salesTransactionId: data.sales_transaction_id,
    amount: data.amount,
    createdBy: req.user.id,
    metadata: data.metadata || null,
  });
  res.status(201).json(
    apiCreated(toGiftCardTransactionDto(movement), {
      message: "Debit gift card enregistre",
    }) satisfies CreateGiftCardMovementResponse,
  );
};
export const createGiftCardRecredit = async (
  req: RequestWithUser,
  res: Response,
) => {
  const id = idSchema().parse(req.params.id);
  const data = giftCardMovementSchema.parse(req.body);
  const movement = await recreditGiftCard({
    giftCardId: id,
    salesTransactionId: data.sales_transaction_id,
    amount: data.amount,
    createdBy: req.user.id,
    metadata: data.metadata || null,
  });
  res.status(201).json(
    apiCreated(toGiftCardTransactionDto(movement), {
      message: "Recredit gift card enregistre",
    }) satisfies CreateGiftCardMovementResponse,
  );
};
