import { Op, literal, type IncludeOptions } from "sequelize";
import type { SalesAnalyticsQuery } from "@recyclerie/api/schemas/salesAnalytics";
import type { TransactionType } from "../../constants/dbEnums.js";
import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";
import type { ModelWhere } from "../../v1/controllers/types.js";
import type { DateRange, UtcBounds } from "./ranges.js";

const { CashRegister, CashSession, SalesTransaction } = db;

/** The parsed query of an analytics request, with both ranges resolved. */
export type SalesAnalyticsRequest<Q extends SalesAnalyticsQuery = SalesAnalyticsQuery> = {
  query: Q;
  storeId: Models["Recyclery"]["id"] | null;
  ranges: { current: DateRange; comparison: DateRange | null };
};

/** What a route computes its figures for: one range (current or comparison) in one Store scope. */
export type SalesAnalyticsScope<Q extends SalesAnalyticsQuery = SalesAnalyticsQuery> = {
  range: DateRange;
  bounds: UtcBounds;
  /** null = all Stores. */
  storeId: Models["Recyclery"]["id"] | null;
  /** The whole request, e.g. to size buckets on the current range while computing the comparison. */
  request: SalesAnalyticsRequest<Q>;
};

/** The part of a scope the loaders need. */
export type LoadScope = Pick<SalesAnalyticsScope, "bounds" | "storeId">;

/**
 * A transaction has at least one `transaction_items` row. For a query whose
 * `SalesTransaction` table is aliased `SalesTransaction` (the root model, or
 * the default include alias).
 */
const HAS_LINES = literal(
  "EXISTS (SELECT 1 FROM `transaction_items` AS `line` WHERE `line`.`transaction_id` = `SalesTransaction`.`id`)",
);

/**
 * **Sale**: `sell`, `completed`, and at least one line. A lineless `sell` is a
 * gift card sale or top-up: counting it would count the same money twice
 * (when the card is bought, then when it pays for goods), so lineless sells
 * belong to the gift card figures only. (Pending confirmation by the user.)
 */
export const SALE_WHERE: ModelWhere<typeof SalesTransaction> = {
  transactionType: "sell",
  status: "completed",
  [Op.and]: [HAS_LINES],
};

/**
 * **Refund**: `refund` and `completed`. Counted on its own date and in its own
 * cash session's Store, never the Sale's.
 */
export const REFUND_WHERE: ModelWhere<typeof SalesTransaction> = {
  transactionType: "refund",
  status: "completed",
};

/** What a transaction in scope (`transactionWhere`) is: a Sale or a Refund. */
export type TransactionKind = "sale" | "refund";

const KIND_OF_TYPE = {
  sell: "sale",
  refund: "refund",
} as const satisfies Record<TransactionType, TransactionKind>;

/** Sale or Refund, from the `transactionType` of a transaction in scope. */
export const transactionKind = (type: TransactionType): TransactionKind =>
  KIND_OF_TYPE[type];

/** Sales and Refunds created in the scope's range. `pending` and `cancelled` never count. */
export const transactionWhere = (
  scope: Pick<LoadScope, "bounds">,
): ModelWhere<typeof SalesTransaction> => ({
  createdAt: { [Op.gte]: scope.bounds.start, [Op.lt]: scope.bounds.end },
  [Op.or]: [SALE_WHERE, REFUND_WHERE],
});

/**
 * Store scope: sales transaction → its own cash session → cash register
 * (`recyclery_id`). Always joined (required), so the Store can be selected as
 * `col("CashSession.CashRegister.recyclery_id")`; filtered only when a Store
 * is chosen.
 */
export const storeInclude = (storeId: Models["Recyclery"]["id"] | null): IncludeOptions => ({
  model: CashSession,
  required: true,
  attributes: [],
  include: [
    {
      model: CashRegister,
      required: true,
      attributes: [],
      ...(storeId ? { where: { recyclery_id: storeId } } : {}),
    },
  ],
});

/** `where` + `include` for a query rooted at `SalesTransaction`. */
export const transactionScope = (scope: LoadScope) => ({
  where: transactionWhere(scope),
  include: [storeInclude(scope.storeId)],
});

/** `include` for a query rooted at another model (lines, payments): its transaction, in scope. */
export const transactionInclude = (scope: LoadScope): IncludeOptions => ({
  model: SalesTransaction,
  required: true,
  attributes: [],
  where: transactionWhere(scope),
  include: [storeInclude(scope.storeId)],
});
