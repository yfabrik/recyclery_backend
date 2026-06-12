import createHttpError from "http-errors";
import { col, fn, literal, Op, type Includeable } from "sequelize";
import z from "zod";

import type { Request, Response } from "express";
import {
  chargeGiftCard,
  findGiftCardByCode,
  issueGiftCard,
  recreditGiftCard,
} from "../../services/giftCards.js";
import { idSchema, postalSchema } from "../../services/zod.js";

import db from "../../models/index.js";

import { formatWhereDateRange } from "../../helpers.js";
import TransactionGlobalPromotion from "../../models/transactionGlobalPromotion.js";
import { type ModelWhere, type RequestWithUser } from "./types.js";
import type { ModelClass } from "../../models/db-types.js";

const {
  CashSession,
  CashRegister,
  Recyclery,
  User,
  TransactionPayment,
  LabeledItem,
  SalesTransaction,
  TransactionItem,
  Category,
  GiftCard,
} = db;

export const getCartLinePrice = (line: CartItem) => {
  let bundles = 0;
  let extraItems = line.quantity;
  if (line.bundleQuantity && line.bundleQuantity !== 0) {
    bundles = Math.trunc(line.quantity / line.bundleQuantity);
    extraItems = line.quantity % line.bundleQuantity;
  }
  const sum = (price: number, quantity: number) =>
    price * quantity * (1 - (line.promotion ?? 0) / 100);
  return (
    sum(line.price, extraItems) + sum(line.bundlePrice || line.price, bundles)
  );
};

const itemSchema = z.object({
  name: z.string(),
  price: z.coerce.number("prix requis").positive(),
  quantity: z.coerce.number().positive().default(1),
  category_id: idSchema(),
  subcategory_id: idSchema().nullish(),
  weight: z.coerce.number("poid requis").nonnegative(),
  barcode: z.string(),
  promotion: z.coerce.number().min(0).max(100).nullish(),
  bundlePrice: z.coerce.number().nullish(),
  bundleQuantity: z.coerce.number().nullish(),
});
const paymentLineSchema = z.object({
  method: z.enum(["cash", "card", "check", "giftcard", "transfer"]), //TODO type enum
  amount: z.coerce.number("montant requis").positive(),
  gift_card_code: z.string().trim().min(1).nullish(),
});
const dataSchema = z
  .object({
    cash_session_id: idSchema("sesions requis"),
    total_amount: z.coerce.number("argent requis"),
    total_amount_before_promotion: z.coerce.number("argent requis"),
    // payment_method: z.enum(["cash", "card", "check"]).default("cash"),
    payment_amount: z.coerce.number("argent requis"),
    payments: z.array(paymentLineSchema).optional(),
    customer_postal_code: postalSchema().nullish(),
    items: z.array(itemSchema),
    change_amount: z.coerce.number().optional(),
    global_promotion: z.coerce
      .number()
      .min(0, "La promotion globale doit être supérieure à 0")
      .nullish(),
    global_promotion_type: z
      .enum(["percent", "fixed"], "Type de promotion globale invalide")
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.global_promotion && !data.global_promotion_type) {
      ctx.addIssue({
        code: "custom",
        message: "global_promotion_type est requis",
      });
    }
    if (data.global_promotion_type && data.global_promotion) {
      if (
        data.global_promotion_type === "percent" &&
        data.global_promotion > 100
      )
        ctx.addIssue({
          code: "custom",
          message: "La promotion globale doit être entre 0 et 100",
        });
    }
  });
type Data = z.infer<typeof dataSchema>;
type CartItem = z.infer<typeof itemSchema>;

type GlobalPromotionType = "percent" | "fixed";

interface GlobalPromotionInput {
  type: GlobalPromotionType;
  value: number;
}
const toAmount = (value?: number | string | null) =>
  Number.parseFloat(String(value ?? 0));

const amountsEqual = (a: number | string, b: number | string) =>
  Math.abs(toAmount(a) - toAmount(b)) < 0.001;

const getCartTotal = (cart: CartItem[]) => {
  return cart.reduce((prev, current) => (prev += getCartLinePrice(current)), 0);
};

const getGlobalPromotionDiscount = (
  subtotal: number,
  promotion?: GlobalPromotionInput | null,
) => {
  if (!promotion) return 0;
  const normalizedValue = Math.max(Number(promotion.value) || 0, 0);
  const discount =
    promotion.type === "percent"
      ? subtotal * (Math.min(normalizedValue, 100) / 100)
      : normalizedValue;
  return Math.min(discount, subtotal);
};

const getCartTotalWithGlobalPromotion = (
  cart: CartItem[],
  promotion?: GlobalPromotionInput | null,
) => {
  const subtotal = getCartTotal(cart);
  const discount = getGlobalPromotionDiscount(subtotal, promotion);
  return Math.max(subtotal - discount, 0);
};
// shared helper — single source of truth
export function computeTotalAfterPromotion(
  before: number,
  promotion: number | null | undefined,
  type: "percent" | "fixed" | null | undefined,
) {
  const subtotal = Number(before);
  const promo = Number(promotion ?? 0);
  if (!promo || !type) return subtotal;
  if (type === "percent") return subtotal * (1 - promo / 100);
  return Math.max(subtotal - promo, 0);
}

const validateSaleAmounts = (data: Data) => {
  const expectedNet = computeTotalAfterPromotion(
    data.total_amount_before_promotion,
    data.global_promotion,
    data.global_promotion_type,
  );
  if (!amountsEqual(expectedNet, data.total_amount)) {
    throw new createHttpError.BadRequest(
      "total_amount incohérent avec total_amount_before_promotion et la promotion globale",
    );
  }
  const totalPayments = data.payments?.reduce(
    (acc, p) => acc + toAmount(p.amount),
    0,
  );
  if (!amountsEqual(totalPayments ?? 0, data.payment_amount)) {
    throw new createHttpError.BadRequest(
      "la somme des paiements doit etre egale au total",
    );
  }
};

const normalizePayments = (data: Data) => {
  const explicitPayments = Array.isArray(data.payments) ? data.payments : [];
  const payments = explicitPayments.length > 0 ? explicitPayments : [];
  // : [{ method: data.payment_method??0, amount: data.payment_amount }];

  const totalPayments = payments.reduce(
    (acc, p) => acc + toAmount(p.amount),
    0,
  );
  if (data.total_amount > totalPayments) {
    // if (!amountsEqual(totalPayments, data.total_amount)) {//TODO FIXME for cash with extra money
    throw new createHttpError.BadRequest(
      "la somme des paiements doit etre au moins egale au total",
    );
  }

  for (const payment of payments) {
    if (payment.method === "giftcard" && !payment.gift_card_code) {
      throw new createHttpError.BadRequest(
        "gift_card_code est requis pour un paiement giftcard",
      );
    }
  }

  return payments;
};

export const listTransactions = async (req: Request, res: Response) => {
  const ALLOWED_INCLUDES = ["refund", "items", "payments"] as const;
  const filterSchema = z.object({
    store_id: z.preprocess(
      (val) => (val === "" ? undefined : val),
      idSchema().optional().nullable(),
    ),
    period: z.string().optional(),
    type: z.enum(["sell", "refund"], "type de transaction inconnu").optional(), //TODO type enum
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    limit: z.coerce.number().positive().optional(),
    offset: z.coerce.number().nonnegative().default(0),
    session: idSchema().optional(),
    payment_method: z
      .enum(
        ["cash", "check", "card", "giftcard", "mixed", "transfer"],
        "methode de payment inconnue",
      )
      .optional(), //TODO type ENUM
    transaction_number: z.string().optional(),
    page: z.coerce.number().positive().optional(),
    include: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  });
  const filter = filterSchema.parse(req.query);

  const where: ModelWhere<typeof SalesTransaction> = {};
  if (filter.transaction_number) where.id = Number(filter.transaction_number);
  // if (filter.store_id) where.recyclery_id = filter.store_id;

  const dateRange = formatWhereDateRange(filter.date_from, filter.date_to);
  if (dateRange) where.createdAt = dateRange;

  if (filter.session) where.cash_session_id = filter.session;
  if (filter.payment_method) where.payment_method = filter.payment_method;
  if (filter.type) where.transactionType = filter.type;

  const whereStore: ModelWhere<typeof CashRegister> = {};
  if (filter.store_id) whereStore.recyclery_id = filter.store_id;

  const pagination = {} as { limit: number; offset: number };
  if (filter.page) {
    pagination.limit = filter.limit || 50;
    pagination.offset = filter.offset || (filter.page - 1) * pagination.limit;
  }
  const include: Includeable[] = [
    {
      model: CashSession,
      include: [
        {
          model: CashRegister,
          where: whereStore,
          // ...(filter.store_id ? { where: { recyclery_id: filter.store_id } } : {}),
          include: [
            {
              model: Recyclery,
              // required: true,
            },
          ],
        },
        {
          model: User,
        },
      ],
      required: true,
    },
    {
      model: TransactionGlobalPromotion,
      as: "globalPromotions",
    },
  ];
  if (filter.include.includes("payments"))
    include.push({
      model: TransactionPayment,
      as: "payments",
    });
  if (filter.include.includes("refund")) {
    const insideInclude: Includeable[] = [];
    if (filter.include.includes("items"))
      insideInclude.push({
        model: LabeledItem,
        as: "items",
      });

    include.push({
      model: SalesTransaction,
      as: "refunds",
      include: insideInclude,
    });
  }
  if (filter.include.includes("items"))
    include.push({
      model: LabeledItem,
      as: "items",
    });

  const transactions = await SalesTransaction.findAndCountAll({
    where,
    include,
    order: [["createdAt", "DESC"]],
    ...pagination,
    distinct: true,
    col: "id",
  });

  res.json({
    success: true,
    transactions: transactions.rows,
    pagination: {
      limit: filter.limit,
      offset: filter.offset,
      total: transactions.count,
    },
  });
};

export const getTransaction = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const transaction = await SalesTransaction.findByPk(id, {
    include: [
      {
        model: LabeledItem,
        as: "items",
        include: [
          { model: Category, as: "category" },
          { model: Category, as: "subcategory" },
        ],
      },
      { model: TransactionPayment, as: "payments" },
      {
        model: CashSession,
        include: [
          {
            model: CashRegister,
            include: [{ model: Recyclery }],
          },
          {
            model: User,
          },
        ],
      },
      {
        model: User,
      },
      { model: GiftCard, as: "giftCards" },
      {
        model: SalesTransaction,
        as: "refunds",
        include: [
          { model: LabeledItem, as: "items" },
          { model: TransactionPayment, as: "payments" },
        ],
      },
      { model: TransactionGlobalPromotion, as: "globalPromotions" },
    ],
  });
  res.json({ success: true, transaction });
};

export const createTransaction = async (
  req: RequestWithUser,
  res: Response,
) => {
  const data = dataSchema.parse(req.body);
  validateSaleAmounts(data);
  const payments = normalizePayments(data);
  const session = await CashSession.findByPk(data.cash_session_id);
  if (!session) throw new createHttpError[404]("session non trouvé");

  const result = await db.sequelize.transaction(async (t) => {
    // const uniqueMethods = [...new Set(payments.map((p) => p.method))];
    // const storedMethod = uniqueMethods.length === 1 ? uniqueMethods[0] : "mixed";
    const storedMethod =
      payments && payments.length === 1
        ? (payments[0]?.method ?? "mixed")
        : "mixed";

    const sale = await session.createSalesTransaction(
      {
        total_amount_before_promotion: data.total_amount_before_promotion,
        total_amount: data.total_amount,
        payment_method: storedMethod,
        payment_amount: data.payment_amount, //TODO payments.reduce(...)
        customer_postal_code: data?.customer_postal_code || null,
        transactionType: "sell",
        // change_amount: data.change_amount,
        // global_promotion: data.global_promotion ?? null,
        // global_promotion_type: data.global_promotion_type ?? null,
      },
      { transaction: t },
    );
    if (data.global_promotion) {
      await sale.createGlobalPromotion(
        {
          value: data.global_promotion,
          type: data.global_promotion_type ?? "percent",
        },
        { transaction: t },
      );
    }
    for await (const item of data.items) {
      if (isNaN(+item.barcode)) {
        await sale.createItem(
          {
            category_id: item.category_id,
            subcategory_id: item.subcategory_id,
            price: item.price,
            weight: item.weight,
            // name: item.name,
            status: "sold",
            // sold_at: new Date(),
            created_by: req.user.id,
          },
          {
            through: {
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              promotionValue: item.promotion,
              bundleQuantity: item.bundleQuantity,
              bundlePrice: item.bundlePrice,
            },
            transaction: t,
          },
        );
      } else {
        const i = await LabeledItem.findByPk(+item.barcode);
        if (!i) throw new createHttpError.NotFound("item not found");
        await i.update(
          {
            // sold_at: new Date(),
            status: "sold",
          },
          { transaction: t },
        );
        await sale.addItem(i, {
          through: {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            promotionValue: item.promotion,
            bundleQuantity: item.bundleQuantity,
            bundlePrice: item.bundlePrice,
          },
          transaction: t,
        });
      }
    }

    for await (const payment of payments.filter(
      (p) => p.method === "giftcard",
    )) {
      const giftCardCode = payment.gift_card_code;
      if (!giftCardCode) {
        throw new createHttpError.BadRequest(
          "gift_card_code est requis pour un paiement giftcard",
        );
      }
      const giftCard = await findGiftCardByCode(giftCardCode, {
        transaction: t,
      });
      if (!giftCard) {
        throw new createHttpError.NotFound("gift card introuvable");
      }
      await chargeGiftCard({
        giftCardId: giftCard.id,
        salesTransactionId: sale.id,
        amount: payment.amount,
        createdBy: req.user.id,
        metadata: { source: "sale_payment" },
        transaction: t,
      });
      await TransactionPayment.create(
        {
          sales_transaction_id: sale.id,
          method: "giftcard",
          amount: payment.amount,
          gift_card_id: giftCard.id,
          metadata: { gift_card_code: giftCardCode },
        },
        { transaction: t },
      );
    }

    for await (const payment of payments.filter(
      (p) => p.method !== "giftcard",
    )) {
      await TransactionPayment.create(
        {
          sales_transaction_id: sale.id,
          method: payment.method,
          amount: payment.amount,
        },
        { transaction: t },
      );
    }

    await sale.reload({
      include: [
        {
          model: TransactionGlobalPromotion,
          as: "globalPromotions",
        },
        {
          model: LabeledItem,
          as: "items",
        },
        {
          model: TransactionPayment,
          as: "payments",
        },
      ],
      transaction: t,
    });
    return sale;
  });

  // Example response:
  // {
  //   "success": true,
  //   "data": {
  //     "id": 123,
  //     "message": "Transaction creee avec succes",
  //     "sale": { "...": "..." },
  //     "payments": [
  //       { "method": "giftcard", "amount": 20, "gift_card_code": "GC00000001" },
  //       { "method": "card", "amount": 5 }
  //     ]
  //   }
  // }
  res.json({
    success: true,
    data: {
      id: result.id,

      message: "Transaction créée avec succès",
      sale: result,
      payments,
    },
  });
};

export const createRefund = async (req: RequestWithUser, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const refundItemSchema = z.object({
    name: z.string(),
    price: z.coerce.number("prix requis").positive(),
    quantity: z.coerce.number().positive().default(1),
    category_id: idSchema(),
    subcategory_id: idSchema().nullish(),
    weight: z.coerce.number("poid requis").nonnegative(),
    barcode: z.string(),
    promotion: z.coerce.number().min(0).max(100).nullish(),
    bundlePrice: z.coerce.number().nullish(),
    bundleQuantity: z.coerce.number().nullish(),
    // refundQantity: z.coerce.number(),
    // refundPrice: z.coerce.number(),
  });
  const refundDataSchema = z.object({
    cash_session_id: idSchema(),
    total_amount: z.coerce.number("argent requis"),
    payment_method: z
      .enum(["cash", "card", "check", "giftcard", "transfer"])
      .default("cash"),
    refund_method: z
      .enum(["cash", "card", "check", "giftcard", "transfer"])
      .default("cash"),
    gift_card_code: z.string().trim().min(1).nullish(),
    refund_reason: z.string("refund raison requis"),
    items: z.array(refundItemSchema),
  });

  const parent = await SalesTransaction.findByPk(id, {
    include: [
      {
        model: SalesTransaction,
        as: "refunds",
        required: false,
        include: [{ model: LabeledItem, as: "items" }],
      },
      { model: LabeledItem, as: "items" },
      { model: TransactionGlobalPromotion, as: "globalPromotions" },
    ],
  });
  if (!parent)
    throw new createHttpError.NotFound("transaction parent pas trouvé");
  const parentRefunds = parent.refunds ?? [];
  const parentItems = parent.items ?? [];
  const parentPromoValue =
    parent.total_amount_before_promotion - parent.total_amount;
  const parentItemsCount = parentItems.reduce(
    (prev, current) => prev + (current.TransactionItem?.quantity ?? 0),
    0,
  );
  const globalPromoPerItem = parentPromoValue / parentItemsCount;

  //item total price / item quatity
  // miss global prom
  //1 faut check si item exist,
  // 2 check si quantity refundable
  // 3 get global promo value
  // 4 total items
  //5 global promo/totalitems
  //6 (total item price /quantitty)-le 5 * refund quantity

  //FIXME on se fait baiser quand les object sont en lot et qu'on rembourse qu'une partie

  const data = refundDataSchema.parse(req.body);
  data.refund_method = data.payment_method;

  const refunded = data.items
    .map((item) => {
      const alreadyRefunded = parentRefunds.reduce((prev, current) => {
        const items = current.items?.filter((i) => i.barcode == item.barcode);
        prev +=
          items?.reduce((p, v) => (p += v.TransactionItem?.quantity ?? 0), 0) ||
          0;
        return prev;
      }, 0);
      //test que le compte d'object deborde pas
      const c = parentItems.find((i) => i.barcode === item.barcode);
      if (!c)
        throw new createHttpError.NotFound("item non trouvé dans la vente");
      if (!c.TransactionItem)
        throw new createHttpError.InternalServerError(
          "transaction item relation manquante",
        );
      if (
        alreadyRefunded &&
        (item.quantity - alreadyRefunded > c.TransactionItem.quantity ||
          item.quantity - alreadyRefunded < 0)
      )
        throw new createHttpError.BadRequest(
          "peut pas rembourser plus d'objects que vendu",
        );
      const toRefundquantity = item.quantity - alreadyRefunded;
      const toRefundNow =
        (c.TransactionItem.total_price / c.TransactionItem.quantity -
          globalPromoPerItem) *
        toRefundquantity;

      const alreadyRefundedPrice = parentRefunds.reduce((prev, current) => {
        const items = current.items?.filter((i) => i.barcode == item.barcode);
        prev +=
          items?.reduce(
            (p, v) => (p += v.TransactionItem?.total_price ?? 0),
            0,
          ) || 0;
        return prev;
      }, 0);
      // const toRefundNow = parent.items?.find((i) => i.barcode == item.barcode)?.TransactionItem?.total_price ??0 - alreadyRefundedPrice;
      // const toRefundNow = getCartLinePrice(item) - alreadyRefundedPrice;

      return {
        ...item,
        alreadyRefunded,
        alreadyRefundedPrice,
        toRefundNow,
      };
    })
    .filter((item) => item.quantity != item.alreadyRefunded);

  // const refundAmount = data.items.map((item) => {
  //   const totalRefund =
  //     getCartLinePrice(item) -
  //     (refunded.find((i) => i.barcode === item.barcode)?.alreadyRefundedPrice ||
  //       0);
  //   return {
  //     ...item,
  //     totalRefund,
  //   };
  // });

  const result = await db.sequelize.transaction(async (t) => {
    let refundGiftCard: null | {
      id: number;
      code: string;
      status: string;
      initial_value?: number;
      current_balance?: number;
      type: "recredit_existing" | "issued_new";
    } = null;

    const total_amount = refunded.reduce(
      (prev, current) => (prev += current.toRefundNow),
      0,
    );

    const refund = await SalesTransaction.create(
      {
        transactionType: "refund",
        created_by: req.user.id,
        cash_session_id: data.cash_session_id,
        total_amount_before_promotion: total_amount,
        total_amount: total_amount,
        payment_method: data.payment_method,
        payment_amount: refunded.reduce(
          (prev, current) => (prev += current.toRefundNow),
          0,
        ),
        transactionId: id,
      },
      { transaction: t },
    );
    for await (const item of refunded) {
      const i = await LabeledItem.findByPk(
        +item.barcode,
        // { transaction: t }
      );
      if (!i) throw new createHttpError.NotFound("item non trouvé");
      await refund.addItem(i, {
        through: {
          name: item.name,
          price: item.price,
          quantity: item.quantity - (item.alreadyRefunded ?? 0),
          promotionValue: item.promotion,
          bundleQuantity: item.bundleQuantity,
          bundlePrice: item.bundlePrice,
        },
        transaction: t,
      });
    }
    if (data.payment_method === "giftcard") {
      const giftCardCode = data.gift_card_code;
      const refundAmount = Number(refund.total_amount || 0);
      if (giftCardCode) {
        const giftCard = await findGiftCardByCode(giftCardCode, {
          transaction: t,
        });
        if (!giftCard) {
          throw new createHttpError.NotFound("gift card introuvable");
        }

        await recreditGiftCard({
          giftCardId: giftCard.id,
          salesTransactionId: refund.id,
          amount: refundAmount,
          createdBy: req.user.id,
          metadata: { source: "refund_recredit", parentTransactionId: id },
          transaction: t,
        });

        await TransactionPayment.create(
          {
            sales_transaction_id: refund.id,
            method: "giftcard",
            amount: refundAmount,
            gift_card_id: giftCard.id,
            metadata: {
              source: "refund_recredit",
              gift_card_code: giftCardCode,
              parentTransactionId: id,
            },
          },
          { transaction: t },
        );

        refundGiftCard = {
          id: giftCard.id,
          code: giftCard.code,
          status: giftCard.status,
          type: "recredit_existing",
        };
      } else {
        // Refund -> Gift card (create a new card when no code is provided)
        const generatedCode = `GC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const giftCard = await issueGiftCard({
          code: generatedCode,
          initialValue: refundAmount,
          issuedRefundTransactionId: refund.id,
          createdBy: req.user.id,
          metadata: { source: "refund_issue", parentTransactionId: id },
          transaction: t,
        });

        await TransactionPayment.create(
          {
            sales_transaction_id: refund.id,
            method: "giftcard",
            amount: refundAmount,
            gift_card_id: giftCard.id,
            metadata: {
              source: "refund_issue",
              gift_card_code: generatedCode,
              parentTransactionId: id,
            },
          },
          { transaction: t },
        );

        refundGiftCard = {
          id: giftCard.id,
          code: giftCard.code,
          status: giftCard.status,
          initial_value: +giftCard.initial_value,
          type: "issued_new",
        };
      }
    } else {
      await TransactionPayment.create(
        {
          sales_transaction_id: refund.id,
          method: data.payment_method,
          amount: Number(refund.total_amount || 0),
          metadata: { source: "refund_payment" },
        },
        { transaction: t },
      );
    }
    return { refund, giftCard: refundGiftCard };
  });

  // Example response:
  // {
  //   "success": true,
  //   "message": "Remboursement cree avec succes",
  //   "refund": { "...": "..." }
  // }
  res.status(201).json({
    success: true,
    message: "Remboursement créé avec succès",
    refund: result.refund,
    ...(result.giftCard ? { giftCard: result.giftCard } : {}),
    // refund,
  });
};

export const listRefunds = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const refunds = await SalesTransaction.findByPk(id, {
    include: [
      {
        model: SalesTransaction,
        as: "refunds",
        required: false,
        include: [{ model: LabeledItem, as: "items" }],
      },
      { model: LabeledItem, as: "items" },
    ],
  });

  res.json({
    success: true,
    refunds: refunds?.refunds,
    ref: refunds,
  });
};

export const transactionsStats = async (req: Request, res: Response) => {
  const filterSchema = z.object({
    store_id: z.union([idSchema(), z.literal("")]).nullish(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  });
  const filter = filterSchema.parse(req.query);

  const where: ModelWhere<typeof SalesTransaction> = {};
  const include: Includeable[] = [];
  if (filter.store_id) {
    include.push({
      model: CashSession,
      required: true,
      attributes: [],
      include: [
        {
          model: CashRegister,
          where: { recyclery_id: filter.store_id },
          required: true,
          attributes: [],
        },
      ],
    });
  }

  const { date_from, date_to } = filter;
  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.createdAt = dateRange;

  // Subquery for total refunded amounts per transaction
  // const refundSubquery = literal(`(
  //     SELECT
  //       SUM(CASE WHEN refund_type IN ('full', 'partial') THEN refund_amount ELSE 0 END)
  //     FROM refunds AS r
  //     WHERE r.transaction_id = SalesTransaction.id
  //       AND r.status = 'completed'
  //   )`);

  // Fetch global stats
  type StatsRow = {
    total_sales_before_refunds: number | string;
    average_transaction: number | string;
    sessions_count: number | string;
  };
  type PaymentMethodRow = {
    payment_method: InstanceType<
      ModelClass<"SalesTransaction">
    >["payment_method"]; //TODO remake with helper
    total: number | string;
    count: number | string;
  };
  type ByDayRow = {
    date: string;
    transaction_count: number | string;
    total_amount: number | string;
  };
  type ByCategoryRow = {
    total_quantity: number | string;
    total_price_sum: number | string;
    category_id: number | string | null;
    category_name: string | null;
  };

  const { count, rows } = (await SalesTransaction.findAndCountAll({
    attributes: [
      [
        fn("COALESCE", fn("SUM", col("total_amount")), 0),
        "total_sales_before_refunds",
      ],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
      // [
      //   fn(
      //     "SUM",
      //     literal(`CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END`),
      //   ),
      //   "cash",
      // ],
      // [
      //   fn(
      //     "SUM",
      //     literal(`CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END`),
      //   ),
      //   "card",
      // ],
    ],
    where,
    include,
    raw: true,
  })) as unknown as { count: number; rows: StatsRow[] };
  // const stats = rows[0].get({ plain: true });
  const statsRow = rows[0] ?? {
    total_sales_before_refunds: 0,
    average_transaction: 0,
    sessions_count: 0,
  };
  const methods = (await SalesTransaction.findAll({
    attributes: [
      "payment_method",
      [fn("SUM", col("total_amount")), "total"],
      [fn("COUNT", col("payment_method")), "count"],
    ],
    where,
    include,
    group: ["payment_method"],
    raw: true,
  })) as unknown as PaymentMethodRow[];

  // Stats grouped per day: transaction count and total amount
  const byDay = (await SalesTransaction.findAll({
    attributes: [
      [fn("DATE", col("SalesTransaction.createdAt")), "date"],
      [fn("COUNT", col("SalesTransaction.id")), "transaction_count"],
      [
        fn("COALESCE", fn("SUM", col("SalesTransaction.total_amount")), 0),
        "total_amount",
      ],
    ],
    where,
    include,
    group: [fn("DATE", col("SalesTransaction.createdAt"))],
    order: [[col("date"), "ASC"]],
    raw: true,
  })) as unknown as ByDayRow[];

  // Stats grouped by category: sum of quantity and sum of total_price from transaction items
  // total_price is virtual in TransactionItem (price*extraItems*(1-promo) + (bundlePrice|price)*bundles*(1-promo))
  const totalPriceExpr = literal(`(
    (TransactionItem.price * (CASE WHEN TransactionItem.bundleQuantity IS NOT NULL AND TransactionItem.bundleQuantity != 0 THEN TransactionItem.quantity % TransactionItem.bundleQuantity ELSE TransactionItem.quantity END) * (1 - COALESCE(TransactionItem.promotionValue, 0) / 100))
    + (COALESCE(TransactionItem.bundlePrice, TransactionItem.price) * (CASE WHEN TransactionItem.bundleQuantity IS NOT NULL AND TransactionItem.bundleQuantity != 0 THEN CAST(TransactionItem.quantity / TransactionItem.bundleQuantity AS INTEGER) ELSE 0 END) * (1 - COALESCE(TransactionItem.promotionValue, 0) / 100))
  )`);
  const byCategory = (await TransactionItem.findAll({
    attributes: [
      [fn("SUM", col("TransactionItem.quantity")), "total_quantity"],
      [fn("COALESCE", fn("SUM", totalPriceExpr), 0), "total_price_sum"],
      [col("LabeledItem.category_id"), "category_id"],
      [col("LabeledItem.category.name"), "category_name"],
    ],
    include: [
      {
        model: SalesTransaction,
        where,
        include,
        required: true,
        attributes: [],
      },
      {
        model: LabeledItem,
        required: true,
        attributes: [],
        include: [
          {
            model: Category,
            as: "category",
            required: false,
            attributes: [],
          },
        ],
      },
    ],
    group: [col("LabeledItem.category_id"), col("LabeledItem.category.name")],
    raw: true,
  })) as unknown as ByCategoryRow[];

  // const stats = await SalesTransaction.findAll({
  //   attributes: [
  //     [fn("COUNT", col("id")), "total_transactions"],
  //     [
  //       fn("COALESCE", fn("SUM", col("total_amount")), 0),
  //       "total_sales_before_refunds",
  //     ],
  //     [
  //       literal(
  //         "COALESCE(SUM(total_amount) - COALESCE(SUM((" +
  //           refundSubquery.val +
  //           ")), 0), 0)",
  //       ),
  //       "total_sales",
  //     ],
  //     [
  //       fn("COALESCE", fn("AVG", col("total_amount")), 0),
  //       "average_transaction",
  //     ],
  //     [fn("COUNT", fn("DISTINCT", col("cash_session_id"))), "sessions_count"],
  //     [
  //       fn("COALESCE", fn("SUM", literal(refundSubquery.val)), 0),
  //       "total_refunded",
  //     ],
  //   ],
  //   where,
  //   raw: true,
  // });
  res.json({
    success: true,
    stats: {
      total_transactions: count,
      total_sales: statsRow.total_sales_before_refunds,
      ...statsRow,
      total_refunded: 0,
      payment_methods: methods ?? [],
      by_day: byDay.map((row) => ({
        date: row.date,
        transaction_count: Number(row.transaction_count ?? 0),
        total_amount: parseFloat(String(row.total_amount ?? 0)),
      })),
      by_category: byCategory.map((row) => ({
        category_id: row.category_id,
        category_name: row.category_name ?? null,
        total_quantity: Number(row.total_quantity ?? 0),
        total_price_sum: parseFloat(String(row.total_price_sum ?? 0)),
      })),
      // total_sales_before_refunds: parseFloat(
      //   stats[0].total_sales_before_refunds || 0,
      // ),
      // total_sales: parseFloat(stats[0].total_sales || 0),
      // total_refunded: parseFloat(stats[0].total_refunded || 0),
      // average_transaction: parseFloat(stats[0].average_transaction || 0),
      // sessions_count: stats[0].sessions_count || 0,
      // payment_methods: stats.map((method) => ({
      //   payment_method: method.payment_method,
      //   count: method.count,
      //   total: parseFloat(method.total || 0),
      // })),
    },
  });
};

export const transactionStatsPostalCode = async (
  req: Request,
  res: Response,
) => {
  const filterSchema = z.object({
    store_id: z.union([idSchema(), z.literal("")]).nullish(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  });
  const filter = filterSchema.parse(req.query);
  const { store_id, date_from, date_to } = filter;

  const where: ModelWhere<typeof SalesTransaction> = {};
  const include: Includeable[] = [];
  // include.push({ model: LabeledItem, as: "items" })
  where.customer_postal_code = { [Op.ne]: null };
  if (store_id) //where.store_id = store_id;
  {
    include.push({
      model: CashSession,
      include: [{ model: CashRegister, where: { recyclery_id: store_id } }],
    });
  }

  const dateRange = formatWhereDateRange(date_from, date_to);
  if (dateRange) where.createdAt = dateRange;

  const postalStats = await SalesTransaction.findAll({
    where,
    include,
    attributes: [
      [fn("COUNT", col("SalesTransaction.id")), "transaction_count"],
      [
        fn("COALESCE", fn("AVG", col("total_amount")), 0),
        "average_transaction",
      ],
      [fn("COALESCE", fn("SUM", col("total_amount")), 0), "total_sales"],
      "customer_postal_code",
    ],
    group: ["customer_postal_code"],
    order: [["total_sales", "DESC"]],
  });

  res.json({
    success: true,
    postal_codes: postalStats,
  });
};
